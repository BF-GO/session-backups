import { describe, expect, it } from 'vitest';

import type {
  SavedSession,
  SavedWindow,
  SessionStorageSettings,
} from '../../types/session';
import {
  defaultStorageState,
  MAX_SESSION_COUNT,
  STORAGE_KEY,
} from '../validation/session-schema';
import {
  applyRetentionToSessions,
  SessionRepository,
} from './session-repository';
import { MemoryStorageAdapter } from './storage-adapter';

function idFactory(): () => string {
  let id = 0;
  return () => `id-${++id}`;
}

function makeWindow(url = 'https://example.com'): SavedWindow {
  return {
    id: `window-${url}`,
    focused: true,
    state: 'normal',
    groups: [],
    tabs: [
      {
        id: `tab-${url}`,
        url,
        title: url,
        favIconUrl: null,
        pinned: false,
        active: true,
        index: 0,
        groupId: null,
      },
    ],
  };
}

function makeSession(
  id: string,
  source: SavedSession['source'],
  createdAt: number,
  pinned = false,
): SavedSession {
  return {
    id,
    name: null,
    createdAt,
    updatedAt: createdAt,
    source,
    pinned,
    hash: `hash-${id}`,
    windows: [makeWindow(`https://example.com/${id}`)],
  };
}

const settings: SessionStorageSettings = {
  autoBackupIntervalMinutes: 10,
  notificationsEnabled: true,
  theme: 'system',
  retention: { automatic: 2, change: 1 },
};

describe('SessionRepository', () => {
  it('does not duplicate an unchanged automatic state', async () => {
    const repository = new SessionRepository(
      new MemoryStorageAdapter(),
      idFactory(),
      () => 100,
    );
    const first = await repository.createSession({
      source: 'automatic',
      windows: [makeWindow()],
    });
    const second = await repository.createSession({
      source: 'automatic',
      windows: [makeWindow()],
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(await repository.listSessions()).toHaveLength(1);
  });

  it('creates a new restore point when browser state returns to an older hash', async () => {
    let now = 100;
    const repository = new SessionRepository(
      new MemoryStorageAdapter(),
      idFactory(),
      () => ++now,
    );
    await repository.createSession({
      source: 'change',
      windows: [makeWindow('https://a.example')],
    });
    await repository.createSession({
      source: 'change',
      windows: [makeWindow('https://b.example')],
    });
    const returned = await repository.createSession({
      source: 'change',
      windows: [makeWindow('https://a.example')],
    });
    expect(returned.created).toBe(true);
    expect(await repository.listSessions()).toHaveLength(3);
  });

  it('serializes concurrent writes without losing sessions', async () => {
    let now = 100;
    const repository = new SessionRepository(
      new MemoryStorageAdapter(),
      idFactory(),
      () => ++now,
    );
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        repository.createSession({
          source: 'manual',
          name: `Snapshot ${index}`,
          windows: [makeWindow(`https://example.com/${index}`)],
        }),
      ),
    );
    expect(await repository.listSessions()).toHaveLength(20);
  });

  it('merges imports by default and replaces only sessions when requested', async () => {
    const repository = new SessionRepository(
      new MemoryStorageAdapter(),
      idFactory(),
      () => 500,
    );
    await repository.createSession({
      source: 'manual',
      windows: [makeWindow('https://existing.example.test/')],
    });
    const settingsBefore = await repository.getSettings();
    const payload = {
      format: 'session-saver',
      version: 2,
      exportedAt: 100,
      sessions: [makeSession('incoming', 'manual', 100)],
    };

    await repository.importSessions(payload);
    expect(await repository.listSessions()).toHaveLength(2);

    await repository.importSessions(payload, 'replace');
    const sessions = await repository.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.source).toBe('import');
    expect(await repository.getSettings()).toEqual(settingsBefore);
  });

  it('imports legacy collections and reports invalid legacy entries', async () => {
    const repository = new SessionRepository(
      new MemoryStorageAdapter(),
      idFactory(),
      () => 500,
    );
    const result = await repository.importSessions({
      autoSessions: [
        {
          timestamp: 100,
          windows: [{ tabs: [{ url: 'https://legacy.example.test/' }] }],
        },
        { timestamp: 'invalid', windows: [] },
      ],
    });

    expect(result).toMatchObject({ imported: 1, skipped: 1 });
    expect((await repository.listSessions())[0]!.source).toBe('import');
  });

  it('leaves storage unchanged when merge would exceed its session limit', async () => {
    const state = defaultStorageState(100);
    state.sessions = Array.from({ length: MAX_SESSION_COUNT }, (_, index) =>
      makeSession(`existing-${index}`, 'manual', index),
    );
    const storage = new MemoryStorageAdapter({ [STORAGE_KEY]: state });
    const repository = new SessionRepository(storage, idFactory(), () => 500);
    const payload = {
      format: 'session-saver',
      version: 2,
      exportedAt: 100,
      sessions: [makeSession('incoming', 'manual', 100)],
    };

    await expect(repository.importSessions(payload)).rejects.toThrow(
      'storage limit',
    );
    const stored = storage.values[STORAGE_KEY] as { sessions: SavedSession[] };
    expect(stored.sessions).toHaveLength(MAX_SESSION_COUNT);
  });
});

describe('applyRetentionToSessions', () => {
  it('keeps manual, imported and pinned sessions while trimming automatic sources', () => {
    const sessions = [
      makeSession('manual', 'manual', 1),
      makeSession('import', 'import', 2),
      makeSession('pinned-old-auto', 'automatic', 0, true),
      makeSession('auto-1', 'automatic', 1),
      makeSession('auto-2', 'automatic', 2),
      makeSession('auto-3', 'automatic', 3),
      makeSession('change-1', 'change', 1),
      makeSession('change-2', 'change', 2),
    ];
    expect(
      applyRetentionToSessions(sessions, settings)
        .map((session) => session.id)
        .sort(),
    ).toEqual(
      [
        'auto-2',
        'auto-3',
        'change-2',
        'import',
        'manual',
        'pinned-old-auto',
      ].sort(),
    );
  });

  it('keeps exact count boundaries and resolves equal timestamps stably', () => {
    const boundarySettings = {
      ...settings,
      retention: { automatic: 2, change: 1 },
    };
    const sessions = [
      makeSession('auto-first', 'automatic', 10),
      makeSession('auto-second', 'automatic', 10),
      makeSession('auto-third', 'automatic', 9),
      makeSession('change-first', 'change', 20),
      makeSession('change-second', 'change', 19),
    ];

    expect(
      applyRetentionToSessions(sessions, boundarySettings).map(
        (session) => session.id,
      ),
    ).toEqual(['auto-first', 'auto-second', 'change-first']);
  });
});
