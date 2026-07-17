import { ChevronDown, Library, Save, Search, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';

import { SessionCard } from '../../components/session-card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  deleteSession,
  downloadJson,
  exportSession,
  getSettings,
  listSessions,
  restoreSession,
  saveSession,
  updateSession,
} from '../../lib/chrome/messaging';
import {
  matchesSearch,
  relativeTime,
  sessionTitle,
} from '../../lib/ui/session-display';
import type { SavedSession, SessionStorageSettings } from '../../types/session';

type Filter = 'recent' | 'pinned' | 'manual' | 'automatic' | 'import';

const filters: { value: Filter; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'pinned', label: 'Pinned' },
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'import', label: 'Imported' },
];

function applyTheme(theme: SessionStorageSettings['theme']): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function App() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('recent');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Loading sessions…');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await listSessions();
    setSessions(next);
    setStatus(next.length === 0 ? 'No snapshots yet.' : '');
  }, []);

  useEffect(() => {
    void Promise.all([listSessions(), getSettings()])
      .then(([loadedSessions, loadedSettings]) => {
        setSessions(loadedSessions);
        setStatus(loadedSessions.length === 0 ? 'No snapshots yet.' : '');
        applyTheme(loadedSettings.theme);
      })
      .catch((error: unknown) =>
        setStatus(error instanceof Error ? error.message : String(error)),
      );
  }, [reload]);

  const visibleSessions = useMemo(
    () =>
      sessions.filter((session) => {
        if (!matchesSearch(session, query)) return false;
        if (filter === 'pinned') return session.pinned;
        if (filter === 'manual') return session.source === 'manual';
        if (filter === 'automatic')
          return session.source === 'automatic' || session.source === 'change';
        if (filter === 'import') return session.source === 'import';
        return true;
      }),
    [filter, query, sessions],
  );

  async function run(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSave(
    scope: 'current' | 'all' | 'selected',
  ): Promise<void> {
    setSaving(true);
    await run(async () => {
      const result = await saveSession(name.trim() || null, scope);
      setName('');
      setStatus(
        result.created
          ? 'Snapshot safely stored.'
          : 'Nothing changed — duplicate skipped.',
      );
      await reload();
    });
    setSaving(false);
  }

  async function handleRestore(session: SavedSession): Promise<void> {
    setBusyId(session.id);
    await run(async () => {
      const result = await restoreSession(session.id);
      setStatus(
        `Restored ${result.restoredTabs} tabs${result.failedTabs ? `, ${result.failedTabs} skipped` : ''}.`,
      );
    });
    setBusyId(null);
  }

  async function handleRename(session: SavedSession): Promise<void> {
    const nextName = prompt(
      'Session name',
      session.name ?? sessionTitle(session),
    );
    if (nextName === null) return;
    await run(async () => {
      await updateSession(session.id, { name: nextName });
      await reload();
    });
  }

  async function handleExport(session: SavedSession): Promise<void> {
    await run(async () => {
      const exported = await exportSession(session.id);
      downloadJson(exported, `session-saver-${session.id}.json`);
      setStatus('Export ready.');
    });
  }

  return (
    <main className="bg-background text-foreground flex h-[600px] w-[380px] flex-col">
      <header className="bg-card border-b px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Session Saver</h1>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {sessions[0]
                ? `Latest snapshot ${relativeTime(sessions[0].createdAt)}`
                : 'Recovery starts with your first snapshot'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="Open settings"
            onClick={() =>
              void browser.tabs.create({
                url: browser.runtime.getURL('/library.html#settings'),
              })
            }
          >
            <Settings2 className="size-4" />
            <span className="sr-only">Open settings</span>
          </Button>
        </div>

        <div className="mt-4 flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Optional snapshot name"
            maxLength={500}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !saving) void handleSave('current');
            }}
          />
          <Button disabled={saving} onClick={() => void handleSave('current')}>
            <Save className="size-4" /> {saving ? 'Saving…' : 'Save'}
          </Button>
          <details className="relative">
            <summary className="rounded-control bg-card hover:bg-muted grid size-9 cursor-pointer list-none place-items-center border">
              <ChevronDown className="size-4" />
              <span className="sr-only">More save options</span>
            </summary>
            <div className="rounded-control bg-card absolute top-10 right-0 z-30 w-44 border p-1 shadow-xl">
              <button
                className="hover:bg-muted w-full rounded-md px-2 py-2 text-left text-xs"
                onClick={() => void handleSave('all')}
              >
                Save all windows
              </button>
              <button
                className="hover:bg-muted w-full rounded-md px-2 py-2 text-left text-xs"
                onClick={() => void handleSave('selected')}
              >
                Save highlighted tabs
              </button>
            </div>
          </details>
        </div>
      </header>

      <section className="border-b px-4 py-3">
        <label className="relative block">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names, titles and URLs"
          />
        </label>
        <div
          className="mt-2 flex gap-1 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Session filters"
        >
          {filters.map((item) => (
            <button
              key={item.value}
              role="tab"
              aria-selected={filter === item.value}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${filter === item.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section
        className="min-h-0 flex-1 overflow-y-auto p-4"
        aria-live="polite"
      >
        <div className="space-y-2.5">
          {visibleSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              busy={busyId === session.id}
              onRestore={() => void handleRestore(session)}
              onRename={() => void handleRename(session)}
              onPin={() =>
                void run(async () => {
                  await updateSession(session.id, { pinned: !session.pinned });
                  await reload();
                })
              }
              onExport={() => void handleExport(session)}
              onDelete={() =>
                void run(async () => {
                  if (!confirm(`Delete “${sessionTitle(session)}”?`)) return;
                  await deleteSession(session.id);
                  await reload();
                })
              }
            />
          ))}
          {visibleSessions.length === 0 && (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No sessions match this view.
            </p>
          )}
        </div>
      </section>

      <footer className="bg-card flex items-center justify-between gap-3 border-t px-4 py-3">
        <p
          className="text-muted-foreground min-w-0 truncate text-xs"
          role="status"
        >
          {status}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void browser.tabs.create({
              url: browser.runtime.getURL('/library.html'),
            })
          }
        >
          <Library className="size-4" /> Open library
        </Button>
      </footer>
    </main>
  );
}
