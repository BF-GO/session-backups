# Migration from v1.7 to v2

Session Saver v2 recognizes the v1.7 keys `autoSessions`, `changeSessions`, `notificationsEnabled`, `autoBackupInterval`, and `theme`.

## Safety sequence

1. Read the current v2 key and all known legacy keys.
2. If valid v2 data exists, use it; remove remaining legacy keys only when its migration marker is complete.
3. If a present v2 value is invalid, stop and preserve every value.
4. Validate every legacy session and transform it into schema v2.
5. Stop without writing if any legacy session is invalid.
6. Write the complete v2 document.
7. Read the new key back and validate the stored result.
8. Delete legacy keys only after that verification succeeds.

## Interruption and retry

An error before or during the v2 write leaves legacy keys untouched. If the write succeeds but verification is interrupted or fails, legacy keys still remain. On the next initialization, a valid v2 document with a completed migration marker is authoritative and the remaining legacy keys are removed.

This makes the migration idempotent: repeated successful initialization returns the same v2 data rather than importing the old sessions again.

## Invalid and partially valid data

Startup migration is all-or-nothing. One invalid legacy entry stops the migration, leaves legacy data unchanged, and surfaces an error. User-initiated import of a legacy export is different: valid entries may be imported while invalid entries are counted as skipped, because the source file remains outside extension storage and existing data is not at risk.

## Historical source

The original implementation is excluded from the current tree and build. It is preserved for audit and migration reference in the [`pre-releases` history at commit `128729d`](https://github.com/BF-GO/session-backups/tree/128729d). Migration fixtures and tests use synthetic data rather than real browsing records.
