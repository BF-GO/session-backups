import { z } from 'zod';

import { calculateSessionHash } from '../sessions/hash';
import type {
  SavedSession,
  SavedWindow,
  SessionSource,
} from '../../types/session';
import {
  STORAGE_KEY,
  defaultStorageState,
  sanitizeText,
  sessionStorageStateSchema,
} from '../validation/session-schema';
import type { StorageAdapter } from './storage-adapter';

export const LEGACY_STORAGE_KEYS = [
  'autoSessions',
  'changeSessions',
  'notificationsEnabled',
  'autoBackupInterval',
  'theme',
] as const;

const legacyTabSchema = z.object({
  url: z.string().min(1).max(20_000),
  title: z.string().max(2_000).optional(),
});

const legacyWindowSchema = z.object({
  tabs: z.array(legacyTabSchema).max(2_000),
});

const legacySessionSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  windows: z.array(legacyWindowSchema).max(100),
});

export type IdFactory = () => string;

function parseTimestamp(value: string | number): number | null {
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : null;
}

export function convertLegacyCollection(
  value: unknown,
  source: Extract<SessionSource, 'automatic' | 'change'>,
  createId: IdFactory,
): { converted: SavedSession[]; skipped: number } {
  if (!Array.isArray(value)) return { converted: [], skipped: 0 };

  const converted: SavedSession[] = [];
  let skipped = Math.max(0, value.length - 2_000);

  for (const entry of value.slice(0, 2_000)) {
    const parsed = legacySessionSchema.safeParse(entry);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    const legacySession = parsed.data;
    const createdAt = parseTimestamp(legacySession.timestamp);
    if (createdAt === null) {
      skipped += 1;
      continue;
    }

    const windows: SavedWindow[] = legacySession.windows.map(
      (legacyWindow) => ({
        id: createId(),
        focused: false,
        state: 'normal',
        groups: [],
        tabs: legacyWindow.tabs.map((tab, index) => ({
          id: createId(),
          url: tab.url,
          title: sanitizeText(tab.title ?? tab.url, 2_000),
          favIconUrl: null,
          pinned: false,
          active: index === 0,
          index,
          groupId: null,
        })),
      }),
    );

    converted.push({
      id: createId(),
      name: null,
      createdAt,
      updatedAt: createdAt,
      source,
      pinned: false,
      hash: calculateSessionHash(windows),
      windows,
    });
  }

  return { converted, skipped };
}

export async function loadOrMigrateStorage(
  storage: StorageAdapter,
  createId: IdFactory,
  now = Date.now(),
) {
  const stored = await storage.get([STORAGE_KEY, ...LEGACY_STORAGE_KEYS]);
  const existingState = sessionStorageStateSchema.safeParse(
    stored[STORAGE_KEY],
  );

  if (existingState.success) {
    const remainingLegacyKeys = LEGACY_STORAGE_KEYS.filter(
      (key) => key in stored,
    );
    if (
      remainingLegacyKeys.length > 0 &&
      existingState.data.migration.legacyV1Completed
    ) {
      await storage.remove(remainingLegacyKeys);
    }
    return existingState.data;
  }

  if (stored[STORAGE_KEY] !== undefined) {
    throw new Error(
      'Stored Session Saver data has an unsupported or damaged schema.',
    );
  }

  const auto = convertLegacyCollection(
    stored.autoSessions,
    'automatic',
    createId,
  );
  const change = convertLegacyCollection(
    stored.changeSessions,
    'change',
    createId,
  );
  if (auto.skipped + change.skipped > 0) {
    throw new Error(
      `Legacy migration stopped because ${auto.skipped + change.skipped} entries are invalid. Legacy data was not changed.`,
    );
  }
  const state = defaultStorageState(now);
  state.sessions = [...auto.converted, ...change.converted].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  if (typeof stored.notificationsEnabled === 'boolean') {
    state.settings.notificationsEnabled = stored.notificationsEnabled;
  }
  const legacyInterval = Number(stored.autoBackupInterval);
  if (
    Number.isInteger(legacyInterval) &&
    legacyInterval >= 1 &&
    legacyInterval <= 43_200
  ) {
    state.settings.autoBackupIntervalMinutes = legacyInterval;
  }
  if (stored.theme === 'light' || stored.theme === 'dark') {
    state.settings.theme = stored.theme;
  }

  await storage.set({ [STORAGE_KEY]: state });

  const verification = await storage.get([STORAGE_KEY]);
  const verifiedState = sessionStorageStateSchema.parse(
    verification[STORAGE_KEY],
  );
  const legacyKeysPresent = LEGACY_STORAGE_KEYS.filter((key) => key in stored);
  if (legacyKeysPresent.length > 0) {
    await storage.remove(legacyKeysPresent);
  }

  return verifiedState;
}
