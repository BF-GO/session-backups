import { browser } from 'wxt/browser';

import type {
  RestoreOptions,
  RestoreResult,
  SavedSession,
  SavedTab,
  SavedWindow,
} from '../../types/session';
import { isSupportedUrl } from '../validation/session-schema';

export const MAX_RESTORE_TABS = 2_000;

export interface RestorePlanWindow {
  savedWindow: SavedWindow;
  tabs: SavedTab[];
}

export interface RestorePlan {
  windows: RestorePlanWindow[];
  selectedTabs: number;
  skippedTabs: number;
  errors: string[];
}

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

export function createRestorePlan(
  session: SavedSession,
  options: RestoreOptions = {},
): RestorePlan {
  const windows: RestorePlanWindow[] = [];
  const errors: string[] = [];
  let selectedTabCount = 0;
  let skippedTabs = 0;

  for (const savedWindow of session.windows) {
    const selected = selectedTabs(savedWindow, options);
    selectedTabCount += selected.length;
    const restorable = selected.filter((tab) => {
      if (isSupportedUrl(tab.url)) return true;
      skippedTabs += 1;
      errors.push(`Skipped unsupported URL: ${tab.url}`);
      return false;
    });
    if (restorable.length > 0) windows.push({ savedWindow, tabs: restorable });
  }

  if (selectedTabCount > MAX_RESTORE_TABS) {
    throw new Error(
      `Restore exceeds the ${MAX_RESTORE_TABS}-tab safety limit. Select fewer tabs and try again.`,
    );
  }

  return {
    windows,
    selectedTabs: selectedTabCount,
    skippedTabs,
    errors,
  };
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
  const errors: string[] = [];

  try {
    const createdWindow = await browser.windows.create({
      url: tabs.map((tab) => tab.url),
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
      index < Math.min(tabs.length, createdTabs.length);
      index += 1
    ) {
      const savedTab = tabs[index];
      const createdTab = createdTabs[index];
      if (savedTab?.pinned && createdTab?.id !== undefined) {
        await browser.tabs.update(createdTab.id, { pinned: true });
      }
    }

    const activeIndex = tabs.findIndex((tab) => tab.active);
    const activeTab = createdTabs[activeIndex >= 0 ? activeIndex : 0];
    if (activeTab?.id !== undefined)
      await browser.tabs.update(activeTab.id, { active: true });

    try {
      await restoreGroups(savedWindow, tabs, createdTabs, createdWindow.id);
    } catch (error) {
      errors.push(`Tab groups could not be restored: ${String(error)}`);
    }

    const missingTabs = Math.max(0, tabs.length - createdTabs.length);
    return {
      restored: createdTabs.length,
      failed: missingTabs,
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
  const plan = createRestorePlan(session, options);
  const result: RestoreResult = {
    restoredWindows: 0,
    restoredTabs: 0,
    failedTabs: plan.skippedTabs,
    errors: [...plan.errors],
  };

  for (const { savedWindow, tabs } of plan.windows) {
    const windowResult = await restoreWindow(savedWindow, tabs);
    if (windowResult.restored > 0) result.restoredWindows += 1;
    result.restoredTabs += windowResult.restored;
    result.failedTabs += windowResult.failed;
    result.errors.push(...windowResult.errors);
  }

  return result;
}
