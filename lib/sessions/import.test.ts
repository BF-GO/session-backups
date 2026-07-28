import { describe, expect, it } from 'vitest';

import { inspectImportPayload, parseImportText } from './import';
import {
  MAX_IMPORT_BYTES,
  MAX_SESSION_COUNT,
} from '../validation/session-schema';

function makePayload(): Record<string, unknown> {
  return {
    format: 'session-saver',
    version: 2,
    exportedAt: 100,
    sessions: [
      {
        id: 'session-1',
        name: 'Synthetic session',
        createdAt: 100,
        updatedAt: 100,
        source: 'manual',
        pinned: false,
        hash: 'hash-1',
        windows: [
          {
            id: 'window-1',
            focused: true,
            state: 'normal',
            groups: [],
            tabs: [
              {
                id: 'tab-1',
                url: 'https://example.test/',
                title: 'Example',
                favIconUrl: null,
                pinned: false,
                active: true,
                index: 0,
                groupId: null,
              },
            ],
          },
        ],
      },
    ],
  };
}

function firstTab(payload: Record<string, unknown>): Record<string, unknown> {
  const sessions = payload.sessions as Record<string, unknown>[];
  const windows = sessions[0]!.windows as Record<string, unknown>[];
  return (windows[0]!.tabs as Record<string, unknown>[])[0]!;
}

describe('session import validation', () => {
  it('rejects malformed JSON before repository processing', () => {
    expect(() => parseImportText('{not-json')).toThrow('not valid JSON');
  });

  it('rejects payloads larger than five MiB', () => {
    expect(() => parseImportText('{}', MAX_IMPORT_BYTES + 1)).toThrow(
      'larger than 5 MiB',
    );
  });

  it('rejects unexpected versions, unknown fields and invalid nested values', () => {
    const wrongVersion = makePayload();
    wrongVersion.version = 3;
    expect(() => inspectImportPayload(wrongVersion)).toThrow(
      'invalid or unsupported',
    );

    const unknownRoot = makePayload();
    unknownRoot.unexpected = true;
    expect(() => inspectImportPayload(unknownRoot)).toThrow(
      'invalid or unsupported',
    );

    const unknownNested = makePayload();
    firstTab(unknownNested).unexpected = true;
    expect(() => inspectImportPayload(unknownNested)).toThrow(
      'invalid or unsupported',
    );

    const invalidNested = makePayload();
    firstTab(invalidNested).pinned = 'yes';
    expect(() => inspectImportPayload(invalidNested)).toThrow(
      'invalid or unsupported',
    );
  });

  it('normalizes missing optional tab metadata', () => {
    const payload = makePayload();
    const tab = firstTab(payload);
    delete tab.title;
    delete tab.favIconUrl;
    delete tab.pinned;
    delete tab.active;
    delete tab.index;
    delete tab.groupId;

    const preview = inspectImportPayload(payload);
    expect(preview.kind).toBe('v2');
    if (preview.kind !== 'v2') throw new Error('Expected a v2 preview.');
    expect(preview.sessions[0]!.windows[0]!.tabs[0]).toMatchObject({
      title: '',
      favIconUrl: null,
      pinned: false,
      active: false,
      index: 0,
      groupId: null,
    });
  });

  it('rejects unsafe URL schemes and duplicate session IDs', () => {
    const unsafe = makePayload();
    firstTab(unsafe).url = 'javascript:alert(1)';
    expect(() => inspectImportPayload(unsafe)).toThrow(
      'invalid or unsupported',
    );

    const duplicate = makePayload();
    const sessions = duplicate.sessions as Record<string, unknown>[];
    sessions.push(structuredClone(sessions[0]!));
    expect(() => inspectImportPayload(duplicate)).toThrow(
      'invalid or unsupported',
    );
  });

  it('rejects excessive tab and session counts', () => {
    const tooManyTabs = makePayload();
    const sessions = tooManyTabs.sessions as Record<string, unknown>[];
    const windows = sessions[0]!.windows as Record<string, unknown>[];
    const tab = (windows[0]!.tabs as Record<string, unknown>[])[0]!;
    windows[0]!.tabs = Array.from({ length: 2_001 }, (_, index) => ({
      ...tab,
      id: `tab-${index}`,
      url: `https://example.test/${index}`,
      index,
    }));
    expect(() => inspectImportPayload(tooManyTabs)).toThrow(
      'invalid or unsupported',
    );

    const tooManySessions = makePayload();
    const session = (tooManySessions.sessions as Record<string, unknown>[])[0]!;
    tooManySessions.sessions = Array.from(
      { length: MAX_SESSION_COUNT + 1 },
      (_, index) => ({ ...session, id: `session-${index}` }),
    );
    expect(() => inspectImportPayload(tooManySessions)).toThrow(
      'invalid or unsupported',
    );
  });

  it('recognizes legacy collections without weakening v2 validation', () => {
    const preview = inspectImportPayload({
      autoSessions: [
        {
          timestamp: 100,
          windows: [{ tabs: [{ url: 'https://legacy.example.test/' }] }],
        },
      ],
    });
    expect(preview).toMatchObject({ kind: 'legacy', count: 1 });
  });
});
