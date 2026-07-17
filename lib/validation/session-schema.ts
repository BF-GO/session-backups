import { z } from 'zod';

import {
  SESSION_SOURCES,
  TAB_GROUP_COLORS,
  WINDOW_STATES,
  type SessionStorageState,
} from '../../types/session';

export const CURRENT_SCHEMA_VERSION = 2 as const;
export const STORAGE_KEY = 'sessionSaverState';
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_SESSION_COUNT = 2_000;

export const SUPPORTED_URL_PROTOCOLS = new Set([
  'http:',
  'https:',
  'file:',
  'ftp:',
  'about:',
  'chrome:',
]);

export function isSupportedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      SUPPORTED_URL_PROTOCOLS.has(url.protocol) &&
      (url.protocol !== 'about:' || url.href === 'about:blank')
    );
  } catch {
    return false;
  }
}

export function sanitizeText(value: string, maxLength = 500): string {
  return [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return (
        code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
      );
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

export const savedTabGroupSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(500),
  color: z.enum(TAB_GROUP_COLORS),
  collapsed: z.boolean(),
});

export const savedTabSchema = z.object({
  id: z.string().min(1).max(100),
  url: z.string().min(1).max(20_000),
  title: z.string().max(2_000),
  favIconUrl: z.string().max(20_000).nullable(),
  pinned: z.boolean(),
  active: z.boolean(),
  index: z.number().int().nonnegative(),
  groupId: z.string().min(1).max(100).nullable(),
});

export const savedWindowSchema = z.object({
  id: z.string().min(1).max(100),
  focused: z.boolean(),
  state: z.enum(WINDOW_STATES),
  tabs: z.array(savedTabSchema).max(2_000),
  groups: z.array(savedTabGroupSchema).max(500),
});

export const savedSessionSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(500).nullable(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  source: z.enum(SESSION_SOURCES),
  pinned: z.boolean(),
  hash: z.string().min(1).max(200),
  windows: z.array(savedWindowSchema).max(100),
});

export const settingsSchema = z.object({
  autoBackupIntervalMinutes: z.number().int().min(1).max(43_200),
  notificationsEnabled: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  retention: z.object({
    automatic: z.number().int().min(1).max(10_000),
    change: z.number().int().min(1).max(10_000),
  }),
});

export const sessionStorageStateSchema: z.ZodType<SessionStorageState> =
  z.object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    sessions: z.array(savedSessionSchema).max(MAX_SESSION_COUNT),
    settings: settingsSchema,
    migration: z.object({
      legacyV1Completed: z.boolean(),
      completedAt: z.number().int().nonnegative().nullable(),
    }),
  });

const importedSessionSchema = savedSessionSchema.superRefine(
  (session, context) => {
    session.windows.forEach((window, windowIndex) => {
      window.tabs.forEach((tab, tabIndex) => {
        if (!isSupportedUrl(tab.url)) {
          context.addIssue({
            code: 'custom',
            message: `Unsupported URL protocol: ${tab.url}`,
            path: ['windows', windowIndex, 'tabs', tabIndex, 'url'],
          });
        }
      });
    });
  },
);

export const sessionExportSchema = z.object({
  format: z.literal('session-saver'),
  version: z.literal(CURRENT_SCHEMA_VERSION),
  exportedAt: z.number().int().nonnegative(),
  sessions: z.array(importedSessionSchema).min(1).max(MAX_SESSION_COUNT),
});

export const defaultStorageState = (now = Date.now()): SessionStorageState => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  sessions: [],
  settings: {
    autoBackupIntervalMinutes: 10,
    notificationsEnabled: true,
    theme: 'system',
    retention: {
      automatic: 100,
      change: 50,
    },
  },
  migration: {
    legacyV1Completed: true,
    completedAt: now,
  },
});
