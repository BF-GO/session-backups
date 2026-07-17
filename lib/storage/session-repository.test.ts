import { describe, expect, it } from 'vitest';

import type {
  SavedSession,
  SavedWindow,
  SessionStorageSettings,
} from '../../types/session';
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
});
