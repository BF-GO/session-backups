import { Download, Pin, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { RestoreOptions, SavedSession } from '../types/session';
import { sessionTitle, tabCount } from '../lib/ui/session-display';
import { Button } from './ui/button';

interface SessionDetailsProps {
  session: SavedSession;
  busy: boolean;
  onRestore: (options?: RestoreOptions) => void;
  onRename: () => void;
  onPin: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function SessionDetails({
  session,
  busy,
  onRestore,
  onRename,
  onPin,
  onExport,
  onDelete,
}: SessionDetailsProps) {
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());

  const totalSelected = selectedTabIds.size;
  const allTabIds = useMemo(
    () => session.windows.flatMap((window) => window.tabs.map((tab) => tab.id)),
    [session],
  );

  function toggleTab(id: string): void {
    setSelectedTabIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="bg-card flex h-full min-w-0 flex-col">
      <header className="border-b p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-primary text-xs font-medium tracking-wide uppercase">
              {session.source}
            </p>
            <h2 className="mt-1 truncate text-xl font-bold">
              {sessionTitle(session)}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {session.windows.length} windows · {tabCount(session)} tabs ·{' '}
              {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onRestore()}
          >
            <RotateCcw className="size-4" /> Restore all
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onRename}>
            Rename
          </Button>
          <Button size="sm" variant="outline" onClick={onPin}>
            <Pin className="size-3.5" /> {session.pinned ? 'Unpin' : 'Pin'}
          </Button>
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="size-3.5" /> Export
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {session.windows.map((window, windowIndex) => {
          const windowTabIds = window.tabs.map((tab) => tab.id);
          const allWindowTabsSelected = windowTabIds.every((id) =>
            selectedTabIds.has(id),
          );
          return (
            <section
              key={window.id}
              className="rounded-card overflow-hidden border"
            >
              <div className="bg-muted flex items-center justify-between px-3 py-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={allWindowTabsSelected}
                    onChange={() =>
                      setSelectedTabIds((current) => {
                        const next = new Set(current);
                        windowTabIds.forEach((id) =>
                          allWindowTabsSelected
                            ? next.delete(id)
                            : next.add(id),
                        );
                        return next;
                      })
                    }
                  />
                  Window {windowIndex + 1} · {window.tabs.length} tabs
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onRestore({ windowIds: [window.id] })}
                >
                  Restore window
                </Button>
              </div>
              <ul className="divide-y">
                {window.tabs.map((tab) => (
                  <li
                    key={tab.id}
                    className="flex items-start gap-3 px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedTabIds.has(tab.id)}
                      onChange={() => toggleTab(tab.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {tab.title || 'Untitled tab'}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {tab.url}
                      </p>
                    </div>
                    {tab.pinned && (
                      <span className="bg-muted rounded-full px-2 py-0.5 text-[10px]">
                        Pinned
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <footer className="flex items-center justify-between border-t p-4">
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={totalSelected === allTabIds.length && allTabIds.length > 0}
            onChange={() =>
              setSelectedTabIds(
                totalSelected === allTabIds.length
                  ? new Set()
                  : new Set(allTabIds),
              )
            }
          />
          {totalSelected} selected
        </label>
        <Button
          disabled={busy || totalSelected === 0}
          onClick={() => onRestore({ tabIds: [...selectedTabIds] })}
        >
          Restore selected
        </Button>
      </footer>
    </aside>
  );
}
