import {
  Download,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import type { SavedSession } from '../types/session';
import {
  relativeTime,
  sessionTitle,
  tabCount,
} from '../lib/ui/session-display';
import { FaviconStack } from './favicon-stack';
import { Button } from './ui/button';

interface SessionCardProps {
  session: SavedSession;
  busy?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onRestore: () => void;
  onRename: () => void;
  onPin: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const sourceLabels: Record<SavedSession['source'], string> = {
  manual: 'Manual',
  automatic: 'Automatic',
  change: 'Recovery',
  import: 'Imported',
};

export function SessionCard({
  session,
  busy,
  selected,
  onSelect,
  onRestore,
  onRename,
  onPin,
  onExport,
  onDelete,
}: SessionCardProps) {
  return (
    <article
      className={`rounded-card bg-card border p-3 shadow-sm transition-colors ${selected ? 'border-primary' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <FaviconStack session={session} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              {sessionTitle(session)}
            </h3>
            {session.pinned && (
              <Pin
                className="text-primary size-3.5 shrink-0"
                aria-label="Pinned"
              />
            )}
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="bg-muted rounded-full px-2 py-0.5">
              {sourceLabels[session.source]}
            </span>
            <time dateTime={new Date(session.createdAt).toISOString()}>
              {relativeTime(session.createdAt)}
            </time>
            <span aria-hidden="true">·</span>
            <span>
              {session.windows.length}w / {tabCount(session)}t
            </span>
          </div>
        </div>
        <details
          className="relative"
          onClick={(event) => event.stopPropagation()}
        >
          <summary className="text-muted-foreground hover:bg-muted grid size-8 cursor-pointer list-none place-items-center rounded-lg">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Session actions</span>
          </summary>
          <div className="rounded-control bg-card absolute top-9 right-0 z-20 w-36 border p-1 shadow-lg">
            <button
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs"
              onClick={onRename}
            >
              <Pencil className="size-3.5" /> Rename
            </button>
            <button
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs"
              onClick={onPin}
            >
              {session.pinned ? (
                <PinOff className="size-3.5" />
              ) : (
                <Pin className="size-3.5" />
              )}
              {session.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs"
              onClick={onExport}
            >
              <Download className="size-3.5" /> Export
            </button>
            <button
              className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          </div>
        </details>
      </div>
      <Button
        className="mt-3 w-full"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          onRestore();
        }}
      >
        <RotateCcw className="size-3.5" /> {busy ? 'Restoring…' : 'Restore'}
      </Button>
    </article>
  );
}
