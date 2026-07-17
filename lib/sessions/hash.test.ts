import { describe, expect, it } from 'vitest';

import type { SavedWindow } from '../../types/session';
import { calculateSessionHash } from './hash';

function makeWindow(): SavedWindow {
  return {
    id: 'window-browser-id-does-not-matter',
    focused: true,
    state: 'normal',
    groups: [{ id: 'group-a', title: 'Work', color: 'blue', collapsed: false }],
    tabs: [
      {
        id: 'tab-a',
        url: 'https://EXAMPLE.com:443/path#temporary-fragment',
        title: 'Old title',
        favIconUrl: null,
        pinned: false,
        active: true,
        index: 0,
        groupId: 'group-a',
      },
      {
        id: 'tab-b',
        url: 'https://openai.com/',
        title: 'OpenAI',
        favIconUrl: null,
        pinned: true,
        active: false,
        index: 1,
        groupId: null,
      },
    ],
  };
}

describe('calculateSessionHash', () => {
  it('ignores unstable extension IDs, focus, titles and URL fragments', () => {
    const original = makeWindow();
    const equivalent = structuredClone(original);
    equivalent.id = 'different-window';
    equivalent.focused = false;
    equivalent.tabs[0]!.id = 'different-tab';
    equivalent.tabs[0]!.title = 'Changed title';
    equivalent.tabs[0]!.url = 'https://example.com/path#another-fragment';
    equivalent.groups[0]!.id = 'different-group';
    equivalent.tabs[0]!.groupId = 'different-group';

    expect(calculateSessionHash([equivalent])).toBe(
      calculateSessionHash([original]),
    );
  });

  it('changes when material tab state changes', () => {
    const original = makeWindow();
    const changed = structuredClone(original);
    changed.tabs[0]!.pinned = true;
    expect(calculateSessionHash([changed])).not.toBe(
      calculateSessionHash([original]),
    );
  });
});
