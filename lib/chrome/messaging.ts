import { browser } from 'wxt/browser';

import type { SessionRequest, SessionResponse } from '../../types/messages';
import type {
  CreateSessionResult,
  ImportResult,
  RestoreOptions,
  RestoreResult,
  SavedSession,
  SessionExport,
  SessionStorageSettings,
} from '../../types/session';
import type { SessionPatch } from '../storage/session-repository';

type SuccessfulResponse = Extract<SessionResponse, { ok: true }>;

async function request(message: SessionRequest): Promise<SuccessfulResponse> {
  const response: SessionResponse | undefined =
    await browser.runtime.sendMessage(message);
  if (!response) throw new Error('The background service did not respond.');
  if (!response.ok) throw new Error(response.error);
  return response;
}

export async function listSessions(): Promise<SavedSession[]> {
  const response = await request({ type: 'sessions:list' });
  if (response.type !== 'sessions:list')
    throw new Error('Unexpected response.');
  return response.data;
}

export async function saveSession(
  name: string | null,
  scope: 'current' | 'all' | 'selected',
): Promise<CreateSessionResult> {
  const response = await request({ type: 'sessions:save', name, scope });
  if (response.type !== 'sessions:save')
    throw new Error('Unexpected response.');
  return response.data;
}

export async function updateSession(
  id: string,
  patch: SessionPatch,
): Promise<SavedSession> {
  const response = await request({ type: 'sessions:update', id, patch });
  if (response.type !== 'sessions:update')
    throw new Error('Unexpected response.');
  return response.data;
}

export async function deleteSession(id: string): Promise<boolean> {
  const response = await request({ type: 'sessions:delete', id });
  if (response.type !== 'sessions:delete')
    throw new Error('Unexpected response.');
  return response.data;
}

export async function restoreSession(
  id: string,
  options?: RestoreOptions,
): Promise<RestoreResult> {
  const response = await request({
    type: 'sessions:restore',
    id,
    ...(options === undefined ? {} : { options }),
  });
  if (response.type !== 'sessions:restore')
    throw new Error('Unexpected response.');
  return response.data;
}

export async function exportSession(id: string): Promise<SessionExport> {
  const response = await request({ type: 'sessions:export', id });
  if (response.type !== 'sessions:export')
    throw new Error('Unexpected response.');
  return response.data;
}

export async function importSessions(payload: unknown): Promise<ImportResult> {
  const response = await request({ type: 'sessions:import', payload });
  if (response.type !== 'sessions:import')
    throw new Error('Unexpected response.');
  return response.data;
}

export async function getSettings(): Promise<SessionStorageSettings> {
  const response = await request({ type: 'settings:get' });
  if (response.type !== 'settings:get') throw new Error('Unexpected response.');
  return response.data;
}

export async function updateSettings(
  patch: Partial<SessionStorageSettings>,
): Promise<SessionStorageSettings> {
  const response = await request({ type: 'settings:update', patch });
  if (response.type !== 'settings:update')
    throw new Error('Unexpected response.');
  return response.data;
}

export function downloadJson(payload: unknown, filename: string): void {
  const blobUrl = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}
