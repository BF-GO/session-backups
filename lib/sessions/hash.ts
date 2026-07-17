import type { SavedWindow } from '../../types/session';

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';

    if (
      (url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')
    ) {
      url.port = '';
    }

    return url.href;
  } catch {
    return value.trim();
  }
}

function canonicalize(windows: SavedWindow[]): string {
  return JSON.stringify(
    windows.map((window) => {
      const groupIndexes = new Map(
        window.groups.map((group, index) => [group.id, index]),
      );

      return {
        state: window.state,
        groups: window.groups.map((group) => ({
          title: group.title,
          color: group.color,
          collapsed: group.collapsed,
        })),
        tabs: [...window.tabs]
          .sort((left, right) => left.index - right.index)
          .map((tab) => ({
            url: normalizeUrl(tab.url),
            pinned: tab.pinned,
            group:
              tab.groupId === null
                ? null
                : (groupIndexes.get(tab.groupId) ?? null),
          })),
      };
    }),
  );
}

function fnv1a(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function calculateSessionHash(windows: SavedWindow[]): string {
  const canonical = canonicalize(windows);
  const first = fnv1a(canonical, 0x811c9dc5).toString(16).padStart(8, '0');
  const second = fnv1a(canonical, 0x9e3779b9).toString(16).padStart(8, '0');
  return `v2-${first}${second}`;
}
