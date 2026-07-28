import type {
  CreateSessionResult,
  ImportMode,
  ImportResult,
  RestoreOptions,
  RestoreResult,
  SavedSession,
  SessionExport,
  SessionStorageSettings,
} from './session';
import type { SessionPatch } from '../lib/storage/session-repository';

export type SessionRequest =
  | { type: 'sessions:list' }
  | {
      type: 'sessions:save';
      name: string | null;
      scope: 'current' | 'all' | 'selected';
    }
  | { type: 'sessions:update'; id: string; patch: SessionPatch }
  | { type: 'sessions:delete'; id: string }
  | { type: 'sessions:restore'; id: string; options?: RestoreOptions }
  | { type: 'sessions:export'; id: string }
  | { type: 'sessions:import'; payload: unknown; mode?: ImportMode }
  | { type: 'settings:get' }
  | { type: 'settings:update'; patch: Partial<SessionStorageSettings> };

export type SessionResponse =
  | { ok: true; type: 'sessions:list'; data: SavedSession[] }
  | { ok: true; type: 'sessions:save'; data: CreateSessionResult }
  | { ok: true; type: 'sessions:update'; data: SavedSession }
  | { ok: true; type: 'sessions:delete'; data: boolean }
  | { ok: true; type: 'sessions:restore'; data: RestoreResult }
  | { ok: true; type: 'sessions:export'; data: SessionExport }
  | { ok: true; type: 'sessions:import'; data: ImportResult }
  | {
      ok: true;
      type: 'settings:get' | 'settings:update';
      data: SessionStorageSettings;
    }
  | { ok: false; error: string };
