import type { SavedSession } from '../types/session';

export function FaviconStack({ session }: { session: SavedSession }) {
  const favicons = session.windows
    .flatMap((window) => window.tabs)
    .map((tab) => tab.favIconUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  return (
    <div
      className="flex -space-x-1.5"
      aria-label={`${favicons.length} favicon previews`}
    >
      {favicons.length === 0 ? (
        <span className="bg-muted text-muted-foreground grid size-6 place-items-center rounded-md border text-[10px]">
          {session.windows.length}
        </span>
      ) : (
        favicons.map((url, index) => (
          <span
            key={`${url}-${index}`}
            className="bg-card grid size-6 place-items-center rounded-md border"
          >
            <img
              src={url}
              alt=""
              className="size-3.5"
              referrerPolicy="no-referrer"
            />
          </span>
        ))
      )}
    </div>
  );
}
