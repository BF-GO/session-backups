export const SESSION_SOURCES = [
  'manual',
  'automatic',
  'change',
  'import',
] as const;
export type SessionSource = (typeof SESSION_SOURCES)[number];

export const WINDOW_STATES = [
  'normal',
  'minimized',
  'maximized',
  'fullscreen',
] as const;
export type SavedWindowState = (typeof WINDOW_STATES)[number];

export const TAB_GROUP_COLORS = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
] as const;
export type SavedTabGroupColor = (typeof TAB_GROUP_COLORS)[number];

export interface SavedTabGroup {
  id: string;
  title: string;
  color: SavedTabGroupColor;
  collapsed: boolean;
}

export interface SavedTab {
  id: string;
  url: string;
  title: string;
  favIconUrl: string | null;
  pinned: boolean;
  active: boolean;
  index: number;
  groupId: string | null;
}

export interface SavedWindow {
  id: string;
  focused: boolean;
  state: SavedWindowState;
  tabs: SavedTab[];
  groups: SavedTabGroup[];
}

export interface SavedSession {
  id: string;
  name: string | null;
  createdAt: number;
  updatedAt: number;
  source: SessionSource;
  pinned: boolean;
  hash: string;
  windows: SavedWindow[];
}

export interface SessionStorageSettings {
  autoBackupIntervalMinutes: number;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  retention: {
    automatic: number;
    change: number;
  };
}

export interface SessionStorageState {
  schemaVersion: 2;
  sessions: SavedSession[];
  settings: SessionStorageSettings;
  migration: {
    legacyV1Completed: boolean;
    completedAt: number | null;
  };
}

export interface CreateSessionInput {
  name?: string | null;
  source: SessionSource;
  windows: SavedWindow[];
  pinned?: boolean;
  createdAt?: number;
  hash?: string;
}

export interface CreateSessionResult {
  created: boolean;
  session: SavedSession;
}

export interface RestoreOptions {
  windowIds?: string[];
  tabIds?: string[];
}

export interface RestoreResult {
  restoredWindows: number;
  restoredTabs: number;
  failedTabs: number;
  errors: string[];
}

export interface SessionExport {
  format: 'session-saver';
  version: 2;
  exportedAt: number;
  sessions: SavedSession[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  sessions: SavedSession[];
}
