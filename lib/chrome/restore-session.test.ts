import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SavedSession, SavedTab } from '../../types/session';
import {
  createRestorePlan,
  MAX_RESTORE_TABS,
  restoreSavedSession,
} from './restore-session';

const browserMock = vi.hoisted(() => ({
  windows: { create: vi.fn() },
  tabs: { query: vi.fn(), update: vi.fn(), group: vi.fn() },
  tabGroups: { update: vi.fn() },
}));

vi.mock('wxt/browser', () => ({ browser: browserMock }));

function makeTab(
  id: string,
  index: number,
  overrides: Partial<SavedTab> = {},
): SavedTab {
  return {
    id,
    url: `https://${id}.example.test/`,
    title: id,
    favIconUrl: null,
    pinned: false,
    active: false,
    index,
    groupId: null,
    ...overrides,
  };
}

function makeSession(tabs: SavedTab[]): SavedSession {
  return {
    id: 'session-1',
    name: null,
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
        tabs,
        groups: [
          {
            id: 'group-1',
            title: 'Synthetic group',
            color: 'blue',
            collapsed: false,
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createRestorePlan', () => {
  it('selects tabs predictably, sorts by index and reports unsafe URLs', () => {
    const session = makeSession([
      makeTab('second', 1),
      makeTab('unsafe', 2, { url: 'javascript:alert(1)' }),
      makeTab('first', 0),
    ]);

    const plan = createRestorePlan(session);
    expect(plan.selectedTabs).toBe(3);
    expect(plan.skippedTabs).toBe(1);
    expect(plan.windows[0]!.tabs.map((tab) => tab.id)).toEqual([
      'first',
      'second',
    ]);
    expect(plan.errors[0]).toContain('javascript:');
  });

  it('honors window and tab selections', () => {
    const session = makeSession([makeTab('first', 0), makeTab('second', 1)]);
    expect(
      createRestorePlan(session, {
        windowIds: ['window-1'],
        tabIds: ['second'],
      }).windows[0]!.tabs.map((tab) => tab.id),
    ).toEqual(['second']);
    expect(
      createRestorePlan(session, { windowIds: ['another-window'] }).windows,
    ).toEqual([]);
  });

  it('rejects excessive restores before opening a browser window', () => {
    const tabs = Array.from({ length: MAX_RESTORE_TABS + 1 }, (_, index) =>
      makeTab(`tab-${index}`, index),
    );
    expect(() => createRestorePlan(makeSession(tabs))).toThrow(
      `${MAX_RESTORE_TABS}-tab safety limit`,
    );
    expect(browserMock.windows.create).not.toHaveBeenCalled();
  });
});

describe('restoreSavedSession', () => {
  it('restores ordered tabs, pinned state, active tab and groups', async () => {
    const session = makeSession([
      makeTab('second', 1, { active: true }),
      makeTab('first', 0, { pinned: true, groupId: 'group-1' }),
    ]);
    browserMock.windows.create.mockImplementation(() =>
      Promise.resolve({
        id: 90,
        tabs: [
          { id: 10, index: 0 },
          { id: 11, index: 1 },
        ],
      }),
    );
    browserMock.tabs.update.mockImplementation(() => Promise.resolve({}));
    browserMock.tabs.group.mockImplementation(() => Promise.resolve(7));
    browserMock.tabGroups.update.mockImplementation(() => Promise.resolve({}));

    const result = await restoreSavedSession(session);

    expect(browserMock.windows.create).toHaveBeenCalledWith({
      url: ['https://first.example.test/', 'https://second.example.test/'],
      focused: true,
      state: 'normal',
    });
    expect(browserMock.tabs.update).toHaveBeenCalledWith(10, { pinned: true });
    expect(browserMock.tabs.update).toHaveBeenCalledWith(11, { active: true });
    expect(browserMock.tabs.group).toHaveBeenCalledWith({
      tabIds: [10],
      createProperties: { windowId: 90 },
    });
    expect(browserMock.tabGroups.update).toHaveBeenCalledWith(7, {
      title: 'Synthetic group',
      color: 'blue',
      collapsed: false,
    });
    expect(result).toEqual({
      restoredWindows: 1,
      restoredTabs: 2,
      failedTabs: 0,
      errors: [],
    });
  });

  it('returns browser failures without opening later partial state', async () => {
    browserMock.windows.create.mockImplementation(() =>
      Promise.reject(new Error('Synthetic browser failure')),
    );

    const result = await restoreSavedSession(
      makeSession([makeTab('first', 0)]),
    );
    expect(result.restoredTabs).toBe(0);
    expect(result.failedTabs).toBe(1);
    expect(result.errors.join(' ')).toContain('Synthetic browser failure');
  });
});
