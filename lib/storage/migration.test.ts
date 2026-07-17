import { describe, expect, it } from 'vitest';

import { STORAGE_KEY } from '../validation/session-schema';
import { loadOrMigrateStorage } from './migration';
import { MemoryStorageAdapter } from './storage-adapter';

function idFactory(): () => string {
  let id = 0;
  return () => `id-${++id}`;
}

describe('legacy migration', () => {
  it('migrates v1.7 collections, verifies v2 and only then removes legacy keys', async () => {
    const storage = new MemoryStorageAdapter({
      autoSessions: [
        {
          timestamp: '2026-01-02T03:04:05.000Z',
          windows: [
            {
              id: 42,
              tabs: [{ url: 'https://example.com', title: 'Example' }],
            },
          ],
        },
      ],
      changeSessions: [
        {
          timestamp: '2026-01-03T03:04:05.000Z',
          windows: [{ tabs: [{ url: 'https://openai.com', title: 'OpenAI' }] }],
        },
      ],
      notificationsEnabled: false,
      autoBackupInterval: '30',
      theme: 'dark',
    });

    const state = await loadOrMigrateStorage(storage, idFactory(), 123);

    expect(state.schemaVersion).toBe(2);
    expect(state.sessions.map((session) => session.source).sort()).toEqual([
      'automatic',
      'change',
    ]);
    expect(state.sessions.every((session) => session.name === null)).toBe(true);
    expect(state.settings).toMatchObject({
      notificationsEnabled: false,
      autoBackupIntervalMinutes: 30,
      theme: 'dark',
    });
    expect(storage.values.autoSessions).toBeUndefined();
    expect(storage.values.changeSessions).toBeUndefined();
    expect(storage.values.notificationsEnabled).toBeUndefined();
    expect(storage.values.autoBackupInterval).toBeUndefined();
    expect(storage.values.theme).toBeUndefined();
    expect(storage.values[STORAGE_KEY]).toEqual(state);
  });

  it('is idempotent when run more than once', async () => {
    const storage = new MemoryStorageAdapter({
      autoSessions: [
        {
          timestamp: 100,
          windows: [{ tabs: [{ url: 'https://example.com' }] }],
        },
      ],
    });
    const createId = idFactory();
    const first = await loadOrMigrateStorage(storage, createId, 123);
    const second = await loadOrMigrateStorage(storage, createId, 456);
    expect(second).toEqual(first);
  });

  it('leaves all legacy data intact when any entry is invalid', async () => {
    const legacy = [
      { timestamp: 100, windows: [{ tabs: [{ url: 'https://example.com' }] }] },
      {
        timestamp: 'not-a-date',
        windows: [{ tabs: [{ url: 'https://broken.example' }] }],
      },
    ];
    const storage = new MemoryStorageAdapter({ autoSessions: legacy });

    await expect(
      loadOrMigrateStorage(storage, idFactory(), 123),
    ).rejects.toThrow('Legacy migration stopped');
    expect(storage.values.autoSessions).toEqual(legacy);
    expect(storage.values[STORAGE_KEY]).toBeUndefined();
  });
});
