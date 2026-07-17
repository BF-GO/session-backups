# Session Saver v2

Session Saver is a local-first Chrome extension for automatic recovery points, named session snapshots, selective restore, and safe import/export. Version 2 is built with WXT, React, strict TypeScript, Tailwind CSS v4, Zod, and a typed `chrome.storage.local` repository.

The original v1.7 source remains in `extension/` as the migration reference. The v2 migration reads `autoSessions` and `changeSessions`, validates every legacy entry, writes and verifies schema v2, and only then removes the old keys.

## Development

```sh
npm install
npm run dev
npm run check
```

The production Chrome MV3 build is written to `.output/chrome-mv3`. Load that directory from `chrome://extensions` when Developer mode is enabled.

## Permissions

- `tabs`: read tab URLs, titles, order, pinned state, and create restored tabs.
- `storage`: persist sessions, settings, schema version, and migration state locally.
- `alarms`: schedule automatic recovery points while the service worker is suspended.
- `notifications`: optionally confirm successful automatic snapshots.
- `tabGroups`: capture and recreate supported Chrome Tab Groups.

No host permissions, remote scripts, analytics, accounts, or network services are used.

## Quality commands

- `npm run typecheck` — strict TypeScript validation.
- `npm run lint` — ESLint, including React hooks rules.
- `npm run test` — repository, migration, retention, and hashing tests.
- `npm run build` — production MV3 bundle.
- `npm run format:check` — Prettier verification.
