import { browser } from 'wxt/browser';

import type {
  CreateSessionInput,
  SavedTabGroup,
  SavedWindow,
  SavedWindowState,
  SessionSource,
} from '../../types/session';

const normalWindowStates = new Set<SavedWindowState>([
  'normal',
  'minimized',
  'maximized',
  'fullscreen',
]);

function createId(): string {
  return crypto.randomUUID();
}

async function collectGroups(windowId: number): Promise<{
  groups: SavedTabGroup[];
  ids: Map<number, string>;
}> {
  if (!browser.tabGroups) return { groups: [], ids: new Map() };

  try {
    const browserGroups = await browser.tabGroups.query({ windowId });
    const ids = new Map<number, string>();
    const groups = browserGroups.map((group) => {
      const id = createId();
      ids.set(group.id, id);
      return {
        id,
        title: group.title ?? '',
        color: group.color,
        collapsed: group.collapsed,
      };
    });
    return { groups, ids };
  } catch {
    return { groups: [], ids: new Map() };
  }
}

export async function collectBrowserState(
  scope: 'current' | 'all' | 'selected',
): Promise<SavedWindow[]> {
  const browserWindows =
    scope === 'current' || scope === 'selected'
      ? [await browser.windows.getCurrent({ populate: true })]
      : await browser.windows.getAll({
          populate: true,
          windowTypes: ['normal'],
        });

  const windows: SavedWindow[] = [];
  for (const browserWindow of browserWindows) {
    if (browserWindow.id === undefined) continue;

    const { groups, ids } = await collectGroups(browserWindow.id);
    const tabs = (browserWindow.tabs ?? [])
      .filter((tab) => scope !== 'selected' || tab.highlighted)
      .filter((tab) => Boolean(tab.url ?? tab.pendingUrl))
      .sort((left, right) => left.index - right.index)
      .map((tab) => ({
        id: createId(),
        url: tab.url ?? tab.pendingUrl ?? 'about:blank',
        title: tab.title ?? tab.url ?? 'Untitled tab',
        favIconUrl: tab.favIconUrl ?? null,
        pinned: tab.pinned,
        active: tab.active,
        index: tab.index,
        groupId: tab.groupId === -1 ? null : (ids.get(tab.groupId) ?? null),
      }));

    const state = normalWindowStates.has(
      browserWindow.state as SavedWindowState,
    )
      ? (browserWindow.state as SavedWindowState)
      : 'normal';

    windows.push({
      id: createId(),
      focused: browserWindow.focused,
      state,
      tabs,
      groups,
    });
  }

  return windows;
}

export async function collectSessionInput(
  source: SessionSource,
  name: string | null,
  scope: 'current' | 'all' | 'selected',
): Promise<CreateSessionInput> {
  return {
    source,
    name,
    windows: await collectBrowserState(scope),
  };
}
