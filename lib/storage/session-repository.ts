import { calculateSessionHash } from '../sessions/hash';
import { restoreSavedSession } from '../chrome/restore-session';
import type {
  CreateSessionInput,
  CreateSessionResult,
  ImportResult,
  RestoreOptions,
  RestoreResult,
  SavedSession,
  SavedWindow,
  SessionExport,
  SessionStorageSettings,
  SessionStorageState,
} from '../../types/session';
import {
  STORAGE_KEY,
  sanitizeText,
  savedSessionSchema,
  sessionExportSchema,
  sessionStorageStateSchema,
} from '../validation/session-schema';
import {
  convertLegacyCollection,
  loadOrMigrateStorage,
  type IdFactory,
} from './migration';
import { BrowserStorageAdapter, type StorageAdapter } from './storage-adapter';

export interface SessionPatch {
  name?: string | null;
  pinned?: boolean;
}

export function applyRetentionToSessions(
  sessions: SavedSession[],
  settings: SessionStorageSettings,
): SavedSession[] {
  const keptIds = new Set<string>();

  for (const session of sessions) {
    if (
      session.pinned ||
      session.source === 'manual' ||
      session.source === 'import'
    ) {
      keptIds.add(session.id);
    }
  }

  const keepLatest = (source: 'automatic' | 'change', limit: number) => {
    sessions
      .filter((session) => session.source === source && !session.pinned)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, limit)
      .forEach((session) => keptIds.add(session.id));
  };

  keepLatest('automatic', settings.retention.automatic);
  keepLatest('change', settings.retention.change);
  return sessions.filter((session) => keptIds.has(session.id));
}

function remapImportedWindows(
  windows: SavedWindow[],
  createId: IdFactory,
): SavedWindow[] {
  return windows.map((window) => {
    const groupIds = new Map(
      window.groups.map((group) => [group.id, createId()]),
    );
    return {
      ...window,
      id: createId(),
      groups: window.groups.map((group) => ({
        ...group,
        id: groupIds.get(group.id) ?? createId(),
        title: sanitizeText(group.title, 500),
      })),
      tabs: window.tabs.map((tab) => ({
        ...tab,
        id: createId(),
        title: sanitizeText(tab.title, 2_000),
        favIconUrl: null,
        groupId:
          tab.groupId === null ? null : (groupIds.get(tab.groupId) ?? null),
      })),
    };
  });
}

export class SessionRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: StorageAdapter = new BrowserStorageAdapter(),
    private readonly createId: IdFactory = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  initialize(): Promise<SessionStorageState> {
    return this.enqueue(async () => {
      const state = await this.readState();
      const retained = applyRetentionToSessions(state.sessions, state.settings);
      if (retained.length !== state.sessions.length) {
        state.sessions = retained;
        await this.persist(state);
      }
      return state;
    });
  }

  async listSessions(): Promise<SavedSession[]> {
    const state = await this.readAfterWrites();
    return [...state.sessions].sort(
      (left, right) => right.createdAt - left.createdAt,
    );
  }

  async getSession(id: string): Promise<SavedSession | null> {
    const state = await this.readAfterWrites();
    return state.sessions.find((session) => session.id === id) ?? null;
  }

  createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    return this.enqueue(async () => {
      const state = await this.readState();
      const timestamp = input.createdAt ?? this.now();
      const windows = input.windows;
      const hash = input.hash ?? calculateSessionHash(windows);

      if (input.source === 'automatic' || input.source === 'change') {
        const latestRecoveryPoint = [...state.sessions]
          .filter(
            (session) =>
              session.source === 'automatic' || session.source === 'change',
          )
          .sort((left, right) => right.createdAt - left.createdAt)[0];
        if (latestRecoveryPoint?.hash === hash) {
          return { created: false, session: latestRecoveryPoint };
        }
      }

      const cleanName = input.name ? sanitizeText(input.name, 500) : null;
      const session = savedSessionSchema.parse({
        id: this.createId(),
        name: cleanName || null,
        createdAt: timestamp,
        updatedAt: timestamp,
        source: input.source,
        pinned: input.pinned ?? false,
        hash,
        windows,
      });

      state.sessions.unshift(session);
      state.sessions = applyRetentionToSessions(state.sessions, state.settings);
      await this.persist(state);
      return { created: true, session };
    });
  }

  updateSession(id: string, patch: SessionPatch): Promise<SavedSession> {
    return this.enqueue(async () => {
      const state = await this.readState();
      const index = state.sessions.findIndex((session) => session.id === id);
      const current = state.sessions[index];
      if (!current || index < 0) throw new Error('Session not found.');

      const updated = savedSessionSchema.parse({
        ...current,
        ...(patch.name !== undefined
          ? { name: patch.name ? sanitizeText(patch.name, 500) || null : null }
          : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
        updatedAt: this.now(),
      });
      state.sessions[index] = updated;
      await this.persist(state);
      return updated;
    });
  }

  deleteSession(id: string): Promise<boolean> {
    return this.enqueue(async () => {
      const state = await this.readState();
      const next = state.sessions.filter((session) => session.id !== id);
      if (next.length === state.sessions.length) return false;
      state.sessions = next;
      await this.persist(state);
      return true;
    });
  }

  async restoreSession(
    id: string,
    options: RestoreOptions = {},
  ): Promise<RestoreResult> {
    const session = await this.getSession(id);
    if (!session) throw new Error('Session not found.');
    return restoreSavedSession(session, options);
  }

  importSessions(payload: unknown): Promise<ImportResult> {
    return this.enqueue(async () => {
      const state = await this.readState();
      const parsed = sessionExportSchema.safeParse(payload);
      let incoming: SavedSession[];
      let skipped = 0;

      if (parsed.success) {
        incoming = parsed.data.sessions;
      } else if (payload && typeof payload === 'object') {
        const legacy = payload as Record<string, unknown>;
        const auto = convertLegacyCollection(
          legacy.autoSessions,
          'automatic',
          this.createId,
        );
        const change = convertLegacyCollection(
          legacy.changeSessions,
          'change',
          this.createId,
        );
        incoming = [...auto.converted, ...change.converted];
        skipped = auto.skipped + change.skipped;
        if (incoming.length === 0)
          throw new Error('The import file is not a supported session format.');
      } else {
        throw new Error('The import file is not a supported session format.');
      }

      const imported = incoming.map((session) => {
        const windows = remapImportedWindows(session.windows, this.createId);
        return savedSessionSchema.parse({
          ...session,
          id: this.createId(),
          name: session.name ? sanitizeText(session.name, 500) || null : null,
          source: 'import',
          pinned: session.pinned,
          updatedAt: this.now(),
          hash: calculateSessionHash(windows),
          windows,
        });
      });

      state.sessions = applyRetentionToSessions(
        [...imported, ...state.sessions],
        state.settings,
      );
      await this.persist(state);
      return { imported: imported.length, skipped, sessions: imported };
    });
  }

  async exportSession(id: string): Promise<SessionExport> {
    const session = await this.getSession(id);
    if (!session) throw new Error('Session not found.');
    return {
      format: 'session-saver',
      version: 2,
      exportedAt: this.now(),
      sessions: [session],
    };
  }

  applyRetentionPolicy(): Promise<number> {
    return this.enqueue(async () => {
      const state = await this.readState();
      const previousCount = state.sessions.length;
      state.sessions = applyRetentionToSessions(state.sessions, state.settings);
      if (state.sessions.length !== previousCount) await this.persist(state);
      return previousCount - state.sessions.length;
    });
  }

  async getSettings(): Promise<SessionStorageSettings> {
    return (await this.readAfterWrites()).settings;
  }

  updateSettings(
    patch: Partial<SessionStorageSettings>,
  ): Promise<SessionStorageSettings> {
    return this.enqueue(async () => {
      const state = await this.readState();
      state.settings = {
        ...state.settings,
        ...patch,
        retention: {
          ...state.settings.retention,
          ...patch.retention,
        },
      };
      state.sessions = applyRetentionToSessions(state.sessions, state.settings);
      await this.persist(state);
      return state.settings;
    });
  }

  private async readState(): Promise<SessionStorageState> {
    return loadOrMigrateStorage(this.storage, this.createId, this.now());
  }

  private async readAfterWrites(): Promise<SessionStorageState> {
    await this.writeQueue;
    return this.readState();
  }

  private async persist(state: SessionStorageState): Promise<void> {
    const validated = sessionStorageStateSchema.parse(state);
    await this.storage.set({ [STORAGE_KEY]: validated });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(operation, operation);
    this.writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
