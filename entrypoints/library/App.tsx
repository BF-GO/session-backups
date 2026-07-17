import {
  Archive,
  Download,
  Import,
  Pin,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SessionCard } from '../../components/session-card';
import { SessionDetails } from '../../components/session-details';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  deleteSession,
  downloadJson,
  exportSession,
  getSettings,
  importSessions,
  listSessions,
  restoreSession,
  updateSession,
  updateSettings,
} from '../../lib/chrome/messaging';
import { matchesSearch, sessionTitle } from '../../lib/ui/session-display';
import {
  MAX_IMPORT_BYTES,
  sessionExportSchema,
} from '../../lib/validation/session-schema';
import type {
  RestoreOptions,
  SavedSession,
  SessionStorageSettings,
} from '../../types/session';

type View = 'all' | 'pinned' | 'manual' | 'automatic' | 'import' | 'settings';

const navigation: { value: View; label: string; icon: typeof Archive }[] = [
  { value: 'all', label: 'All sessions', icon: Archive },
  { value: 'pinned', label: 'Pinned', icon: Pin },
  { value: 'manual', label: 'Manual', icon: Sparkles },
  { value: 'automatic', label: 'Automatic', icon: Archive },
  { value: 'import', label: 'Imported', icon: Download },
  { value: 'settings', label: 'Settings', icon: Settings },
];

interface ImportPreview {
  filename: string;
  payload: unknown;
  count: number;
}

function applyTheme(theme: SessionStorageSettings['theme']): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function App() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>(() =>
    location.hash === '#settings' ? 'settings' : 'all',
  );
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Loading…');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<SessionStorageSettings | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const next = await listSessions();
    setSessions(next);
    setSelectedId((current) =>
      current && next.some((session) => session.id === current)
        ? current
        : (next[0]?.id ?? null),
    );
    setStatus(`${next.length} sessions`);
  }, []);

  useEffect(() => {
    void Promise.all([listSessions(), getSettings()])
      .then(([loadedSessions, value]) => {
        setSessions(loadedSessions);
        setSelectedId(loadedSessions[0]?.id ?? null);
        setStatus(`${loadedSessions.length} sessions`);
        setSettings(value);
        applyTheme(value.theme);
      })
      .catch((error: unknown) =>
        setStatus(error instanceof Error ? error.message : String(error)),
      );
  }, [reload]);

  const visibleSessions = useMemo(
    () =>
      sessions.filter((session) => {
        if (!matchesSearch(session, query)) return false;
        if (view === 'pinned') return session.pinned;
        if (view === 'manual') return session.source === 'manual';
        if (view === 'automatic')
          return session.source === 'automatic' || session.source === 'change';
        if (view === 'import') return session.source === 'import';
        return true;
      }),
    [query, sessions, view],
  );
  const selected =
    sessions.find((session) => session.id === selectedId) ?? null;

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function rename(session: SavedSession): Promise<void> {
    const value = prompt('Session name', session.name ?? sessionTitle(session));
    if (value === null) return;
    await run(async () => {
      await updateSession(session.id, { name: value });
      await reload();
    });
  }

  async function restore(
    session: SavedSession,
    options?: RestoreOptions,
  ): Promise<void> {
    await run(async () => {
      const result = await restoreSession(session.id, options);
      setStatus(
        `Restored ${result.restoredTabs} tabs; ${result.failedTabs} failed.`,
      );
    });
  }

  async function exportOne(session: SavedSession): Promise<void> {
    await run(async () => {
      downloadJson(
        await exportSession(session.id),
        `session-saver-${session.id}.json`,
      );
      setStatus('Session exported.');
    });
  }

  async function chooseImport(file: File | undefined): Promise<void> {
    if (!file) return;
    await run(async () => {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error('Import is larger than 5 MB.');
      const payload: unknown = JSON.parse(await file.text());
      const parsed = sessionExportSchema.safeParse(payload);
      if (parsed.success) {
        setPreview({
          filename: file.name,
          payload,
          count: parsed.data.sessions.length,
        });
        return;
      }
      const legacy =
        payload && typeof payload === 'object'
          ? (payload as Record<string, unknown>)
          : null;
      const count = legacy
        ? (Array.isArray(legacy.autoSessions)
            ? legacy.autoSessions.length
            : 0) +
          (Array.isArray(legacy.changeSessions)
            ? legacy.changeSessions.length
            : 0)
        : 0;
      if (count === 0) throw new Error('Unsupported or invalid import file.');
      setPreview({ filename: file.name, payload, count });
    });
  }

  async function confirmImport(): Promise<void> {
    if (!preview) return;
    await run(async () => {
      const result = await importSessions(preview.payload);
      setPreview(null);
      await reload();
      setStatus(`Imported ${result.imported}; skipped ${result.skipped}.`);
    });
  }

  return (
    <main className="bg-background text-foreground grid h-screen min-h-[520px] grid-cols-[210px_minmax(280px,360px)_minmax(420px,1fr)] overflow-hidden max-[900px]:grid-cols-[190px_minmax(280px,1fr)]">
      <nav className="bg-card flex min-h-0 flex-col border-r p-3">
        <div className="px-2 py-3">
          <h1 className="text-lg font-bold">Session Saver</h1>
          <p className="text-muted-foreground text-xs">Recovery library</p>
        </div>
        <div className="mt-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                className={`rounded-control flex w-full items-center gap-3 px-3 py-2 text-sm ${view === item.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                onClick={() => setView(item.value)}
              >
                <Icon className="size-4" /> {item.label}
              </button>
            );
          })}
        </div>
        <div className="mt-auto space-y-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => void chooseImport(event.target.files?.[0])}
          />
          <Button
            className="w-full"
            variant="outline"
            onClick={() => fileInput.current?.click()}
          >
            <Import className="size-4" /> Import sessions
          </Button>
          <p
            className="text-muted-foreground truncate px-2 text-xs"
            role="status"
          >
            {status}
          </p>
        </div>
      </nav>

      <section className="flex min-h-0 flex-col border-r">
        <header className="border-b p-4">
          <h2 className="font-semibold">
            {navigation.find((item) => item.value === view)?.label}
          </h2>
          {view !== 'settings' && (
            <label className="relative mt-3 block">
              <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
              <Input
                className="pl-9"
                placeholder="Search sessions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
        </header>
        {view === 'settings' && settings ? (
          <div className="space-y-5 p-4">
            <label className="block text-sm font-medium">
              Theme
              <select
                className="rounded-control bg-card mt-2 h-9 w-full border px-3"
                value={settings.theme}
                onChange={(event) =>
                  void run(async () => {
                    const value = await updateSettings({
                      theme: event.target
                        .value as SessionStorageSettings['theme'],
                    });
                    setSettings(value);
                    applyTheme(value.theme);
                  })
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Automatic backup interval (minutes)
              <Input
                className="mt-2"
                type="number"
                min={1}
                max={43200}
                value={settings.autoBackupIntervalMinutes}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    autoBackupIntervalMinutes: Number(event.target.value),
                  })
                }
                onBlur={() =>
                  void run(async () =>
                    setSettings(
                      await updateSettings({
                        autoBackupIntervalMinutes:
                          settings.autoBackupIntervalMinutes,
                      }),
                    ),
                  )
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Notifications
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(event) =>
                  void run(async () =>
                    setSettings(
                      await updateSettings({
                        notificationsEnabled: event.target.checked,
                      }),
                    ),
                  )
                }
              />
            </label>
            <div className="border-t pt-5">
              <h3 className="text-sm font-semibold">Retention</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Manual, imported and pinned sessions are never removed
                automatically.
              </p>
            </div>
            <label className="block text-sm font-medium">
              Automatic snapshots
              <Input
                className="mt-2"
                type="number"
                min={1}
                max={10000}
                value={settings.retention.automatic}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    retention: {
                      ...settings.retention,
                      automatic: Math.max(1, Number(event.target.value)),
                    },
                  })
                }
                onBlur={() =>
                  void run(async () =>
                    setSettings(
                      await updateSettings({ retention: settings.retention }),
                    ),
                  )
                }
              />
            </label>
            <label className="block text-sm font-medium">
              Change-triggered snapshots
              <Input
                className="mt-2"
                type="number"
                min={1}
                max={10000}
                value={settings.retention.change}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    retention: {
                      ...settings.retention,
                      change: Math.max(1, Number(event.target.value)),
                    },
                  })
                }
                onBlur={() =>
                  void run(async () =>
                    setSettings(
                      await updateSettings({ retention: settings.retention }),
                    ),
                  )
                }
              />
            </label>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
            {visibleSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                selected={session.id === selectedId}
                busy={busy && session.id === selectedId}
                onSelect={() => setSelectedId(session.id)}
                onRestore={() => void restore(session)}
                onRename={() => void rename(session)}
                onPin={() =>
                  void run(async () => {
                    await updateSession(session.id, {
                      pinned: !session.pinned,
                    });
                    await reload();
                  })
                }
                onExport={() => void exportOne(session)}
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
                No sessions in this view.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="min-h-0 max-[900px]:hidden">
        {selected && view !== 'settings' ? (
          <SessionDetails
            key={selected.id}
            session={selected}
            busy={busy}
            onRestore={(options) => void restore(selected, options)}
            onRename={() => void rename(selected)}
            onPin={() =>
              void run(async () => {
                await updateSession(selected.id, { pinned: !selected.pinned });
                await reload();
              })
            }
            onExport={() => void exportOne(selected)}
            onDelete={() =>
              void run(async () => {
                if (!confirm(`Delete “${sessionTitle(selected)}”?`)) return;
                await deleteSession(selected.id);
                await reload();
              })
            }
          />
        ) : (
          <div className="text-muted-foreground grid h-full place-items-center p-8 text-center text-sm">
            Select a session to inspect its windows and tabs.
          </div>
        )}
      </section>

      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-title"
        >
          <div className="rounded-card bg-card w-full max-w-md border p-5 shadow-2xl">
            <h2 id="import-title" className="text-lg font-bold">
              Import preview
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {preview.filename} contains {preview.count} session
              {preview.count === 1 ? '' : 's'}. Existing sessions will be kept.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void confirmImport()}>
                Import {preview.count}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
