import type { SavedSession } from '../../types/session';

export function sessionTitle(session: SavedSession): string {
  if (session.name) return session.name;
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${session.source === 'change' ? 'Recovery point' : 'Snapshot'} · ${formatter.format(session.createdAt)}`;
}

export function relativeTime(timestamp: number): string {
  const seconds = Math.round((timestamp - Date.now()) / 1_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

export function tabCount(session: SavedSession): number {
  return session.windows.reduce(
    (total, window) => total + window.tabs.length,
    0,
  );
}

export function matchesSearch(
  session: SavedSession,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return true;
  return [
    session.name ?? '',
    ...session.windows.flatMap((window) =>
      window.tabs.flatMap((tab) => [tab.title, tab.url]),
    ),
  ].some((value) => value.toLocaleLowerCase().includes(query));
}
