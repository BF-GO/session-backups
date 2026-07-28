# Contributing

Thank you for helping improve Session Saver.

## Prerequisites

- Node.js 24
- npm
- Google Chrome for manual extension checks

## Setup

```sh
git clone https://github.com/BF-GO/session-backups.git
cd session-backups
npm ci
npm run dev
```

Load `.output/chrome-mv3` from `chrome://extensions` with Developer mode enabled when testing a production build.

## Changes and pull requests

1. Create a focused branch from the latest `main`.
2. Keep behavior changes and unrelated cleanup separate.
3. Add or update tests for domain behavior and failure paths.
4. Run the required checks before opening a pull request.
5. Explain user impact, implementation intent, and verification in the pull request.

Required checks:

```sh
npm run check
npm run test:coverage
npm run zip
```

## Browser checks

Automated tests cover browser adapters with mocks, but changes to capture, restore, alarms, notifications, or tab groups also need a real Chrome check. Confirm the generated manifest permissions, install the unpacked production build in a clean test profile, and exercise the affected flow.

Service-worker behavior should be tested after it has been suspended and restarted, not only while DevTools keeps it alive.

## Test and media data

Use synthetic domains such as `example.test` in fixtures. Never commit real browsing history, account names, authentication tokens, internal URLs, personal session exports, or screenshots from a private profile.

Product screenshots are generated from the synthetic state in `scripts/capture-store-assets.mjs`. Final documentation screenshots belong in `docs/assets/screenshots/`; raw captures remain under `store-assets/screenshots/raw/`.

## Security changes

Do not use a public issue or pull request to disclose an unpatched vulnerability. Follow [SECURITY.md](SECURITY.md).
