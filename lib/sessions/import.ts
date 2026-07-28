import type { SavedSession } from '../../types/session';
import {
  MAX_IMPORT_BYTES,
  sessionExportSchema,
} from '../validation/session-schema';

interface V2ImportPreview {
  kind: 'v2';
  payload: unknown;
  count: number;
  sessions: SavedSession[];
}

interface LegacyImportPreview {
  kind: 'legacy';
  payload: Record<string, unknown>;
  count: number;
}

export type SessionImportPreview = V2ImportPreview | LegacyImportPreview;

function encodedSize(value: unknown): number {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error('The import payload cannot be serialized safely.');
  }
  if (serialized === undefined) {
    throw new Error('The import file is not a supported session format.');
  }
  return new TextEncoder().encode(serialized).byteLength;
}

function assertImportSize(size: number): void {
  if (size > MAX_IMPORT_BYTES) {
    throw new Error('Import is larger than 5 MiB.');
  }
}

export function inspectImportPayload(
  payload: unknown,
  byteLength = encodedSize(payload),
): SessionImportPreview {
  assertImportSize(byteLength);

  const parsed = sessionExportSchema.safeParse(payload);
  if (parsed.success) {
    return {
      kind: 'v2',
      payload: parsed.data,
      count: parsed.data.sessions.length,
      sessions: parsed.data.sessions,
    };
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The import file is not a supported session format.');
  }

  const legacy = payload as Record<string, unknown>;
  if ('format' in legacy || 'version' in legacy) {
    throw new Error('The Session Saver export is invalid or unsupported.');
  }

  const count =
    (Array.isArray(legacy.autoSessions) ? legacy.autoSessions.length : 0) +
    (Array.isArray(legacy.changeSessions) ? legacy.changeSessions.length : 0);
  if (count === 0) {
    throw new Error('The import file is not a supported session format.');
  }

  return { kind: 'legacy', payload: legacy, count };
}

export function parseImportText(
  contents: string,
  byteLength = new TextEncoder().encode(contents).byteLength,
): SessionImportPreview {
  assertImportSize(byteLength);
  let payload: unknown;
  try {
    payload = JSON.parse(contents) as unknown;
  } catch {
    throw new Error('The import file is not valid JSON.');
  }
  return inspectImportPayload(payload, byteLength);
}
