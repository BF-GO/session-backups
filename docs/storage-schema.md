# Storage schema

Session Saver stores one versioned document under `sessionSaverState` in `chrome.storage.local`.

## Schema v2

The top-level document contains:

- `schemaVersion`: currently `2`;
- `sessions`: validated session records;
- `settings`: automatic interval, notification preference, theme, and retention counts;
- `migration`: completion state and completion timestamp for the v1.7 migration.

A session records its stable local ID, optional name, creation/update timestamps, source, pinned state, deterministic content hash, and ordered windows. Windows contain ordered tabs and supported group metadata. Tabs include URL, display metadata, pinned/active state, saved index, and an optional group reference.

## Invariants

- The complete document is validated before each repository write.
- Schema version, enums, identifiers, text lengths, timestamps, and collection sizes are bounded.
- Version 2 imports reject unknown fields and unsupported URL schemes.
- Imported session, window, tab, and group identifiers are remapped before persistence.
- A merge that would exceed the 2000-session storage limit is rejected without a write.
- Replace import changes sessions only; settings and migration state are preserved.
- Repository writes are serialized in process to avoid lost updates.

## Retention

Manual, imported, and pinned sessions are not removed automatically. Unpinned automatic and change-triggered snapshots are sorted newest-first and trimmed to their independent configured count limits. Equal timestamps retain their input order.

Retention is count-based, not age-based.

## Hashing and deduplication

Automatic/change snapshots are compared with the latest recovery-point hash. The canonical hash ignores transient browser IDs, focus, titles, favicon data, default ports, and URL fragments. It includes window state, group presentation, normalized URL order, pinned state, and group membership. If the latest recovery point has the same hash, a duplicate snapshot is not written.

The hash is a deterministic change detector, not a cryptographic integrity or authentication mechanism.

## Compatibility

`package.json` supplies the extension release version; storage remains independently versioned as schema v2. A future incompatible storage shape requires a new schema version and explicit migration. Unsupported or damaged current storage is never silently replaced.
