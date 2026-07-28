# Privacy

Session Saver is designed as a local-first Chrome extension. This document describes version 2.0.0.

## Data handled

To create and restore sessions, the extension can store:

- tab URLs and titles;
- tab order, active and pinned state;
- window order, focus, and display state;
- supported Chrome Tab Group titles, colors, and collapsed state;
- user-provided session names;
- snapshot timestamps and local settings.

This information is stored in `chrome.storage.local` inside the current Chrome profile.

## Data that does not leave the browser

The extension runtime has:

- no account or sign-in system;
- no analytics, telemetry, advertising, or tracking;
- no backend or network service;
- no remote scripts;
- no host permissions;
- no cloud synchronization.

The extension does not transmit stored session data. Links may make normal network requests only when the user restores or opens them in Chrome.

## Exports and imports

An exported JSON file contains the URLs, titles, grouping information, and metadata for the sessions selected by the user. Export files are not encrypted and may reveal sensitive browsing activity. Store, share, and delete them accordingly.

Imported files are limited to 5 MiB and validated before storage. Session Saver rejects unsupported schema versions, unknown fields, invalid nested data, duplicate session IDs, unsafe URL schemes, and excessive collection sizes. Replace imports are validated fully before existing sessions are changed.

## Retention and deletion

Automatic and change-triggered snapshots follow the configured count limits. Manual, imported, and pinned sessions are retained until the user deletes them. Users can delete individual sessions in the extension. Chrome controls deletion of extension storage when an extension or profile is removed.

## Permissions

The exact permission purposes are documented in the [README](README.md#privacy-and-permissions) and match the generated Manifest V3 file. Permission expansion requires an intentional manifest change and review.

## Questions

Privacy or security concerns should follow the private reporting process in [SECURITY.md](SECURITY.md).
