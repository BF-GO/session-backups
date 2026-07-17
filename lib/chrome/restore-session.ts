import { browser } from 'wxt/browser';

import type {
  RestoreOptions,
  RestoreResult,
  SavedSession,
  SavedTab,
  SavedWindow,
} from '../../types/session';
import { isSupportedUrl } from '../validation/session-schema';

function selectedTabs(
  window: SavedWindow,
  options: RestoreOptions,
): SavedTab[] {
  if (options.windowIds && !options.windowIds.includes(window.id)) {
    return [];
  }

  const selected = options.tabIds
    ? window.tabs.filter((tab) => options.tabIds?.includes(tab.id))
    : window.tabs;

  return [...selected].sort((left, right) => left.index - right.index);
}

async function restoreGroups(
  savedWindow: SavedWindow,
  savedTabs: SavedTab[],
  restoredTabs: Browser.tabs.Tab[],
  windowId: number,
): Promise<void> {
  if (!browser.tabs.group || !browser.tabGroups) return;

  for (const group of savedWindow.groups) {
    const tabIds = savedTabs
      .map((tab, index) =>
        tab.groupId === group.id ? restoredTabs[index]?.id : undefined,
      )
      .filter((id): id is number => id !== undefined);

    if (tabIds.length === 0) continue;

    const [firstTabId, ...remainingTabIds] = tabIds;
    if (firstTabId === undefined) continue;
    const groupId = await browser.tabs.group({
      tabIds: [firstTabId, ...remainingTabIds],
      createProperties: { windowId },
    });
    await browser.tabGroups.update(groupId, {
      title: group.title,
      color: group.color,
      collapsed: group.collapsed,
    });
  }
}

async function restoreWindow(
  savedWindow: SavedWindow,
  tabs: SavedTab[],
): Promise<{ restored: number; failed: number; errors: string[] }> {
  const validTabs = tabs.filter((tab) => isSupportedUrl(tab.url));
  const failed = tabs.length - validTabs.length;
  const errors = tabs
    .filter((tab) => !isSupportedUrl(tab.url))
    .map((tab) => `Skipped unsupported URL: ${tab.url}`);

  if (validTabs.length === 0) return { restored: 0, failed, errors };

  try {
    const createdWindow = await browser.windows.create({
      url: validTabs.map((tab) => tab.url),
      focused: savedWindow.focused,
      state: savedWindow.state,
    });
    if (!createdWindow || createdWindow.id === undefined) {
      throw new Error('Browser did not return a window ID.');
    }

    const createdTabs = (
      createdWindow.tabs ??
      (await browser.tabs.query({ windowId: createdWindow.id }))
    )
      .filter((tab) => tab.id !== undefined)
      .sort((left, right) => left.index - right.index);

    for (
      let index = 0;
      index < Math.min(validTabs.length, createdTabs.length);
      index += 1
    ) {
      const savedTab = validTabs[index];
      const createdTab = createdTabs[index];
      if (savedTab?.pinned && createdTab?.id !== undefined) {
        await browser.tabs.update(createdTab.id, { pinned: true });
      }
    }

    const activeIndex = validTabs.findIndex((tab) => tab.active);
    const activeTab = createdTabs[activeIndex >= 0 ? activeIndex : 0];
    if (activeTab?.id !== undefined)
      await browser.tabs.update(activeTab.id, { active: true });

    try {
      await restoreGroups(
        savedWindow,
        validTabs,
        createdTabs,
        createdWindow.id,
      );
    } catch (error) {
      errors.push(`Tab groups could not be restored: ${String(error)}`);
    }

    const missingTabs = Math.max(0, validTabs.length - createdTabs.length);
    return {
      restored: createdTabs.length,
      failed: failed + missingTabs,
      errors,
    };
  } catch (error) {
    return {
      restored: 0,
      failed: tabs.length,
      errors: [...errors, `Window restore failed: ${String(error)}`],
    };
  }
}

export async function restoreSavedSession(
  session: SavedSession,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  const result: RestoreResult = {
    restoredWindows: 0,
    restoredTabs: 0,
    failedTabs: 0,
    errors: [],
  };

  for (const savedWindow of session.windows) {
    const tabs = selectedTabs(savedWindow, options);
    if (tabs.length === 0) continue;

    const windowResult = await restoreWindow(savedWindow, tabs);
    if (windowResult.restored > 0) result.restoredWindows += 1;
    result.restoredTabs += windowResult.restored;
    result.failedTabs += windowResult.failed;
    result.errors.push(...windowResult.errors);
  }

  return result;
}
