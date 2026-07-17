# Chrome Web Store assets

All upload-ready screenshots and promo images are PNG files in RGB mode without transparency. The store icon uses RGBA transparency as recommended by Chrome.

## Store icon

- `icon/session-saver-store-icon-128x128.png` — Chrome Web Store icon, 128×128 RGBA PNG.
- The 96×96 artwork is centered with 16 px of transparent padding on every side, following Chrome's store guidance.
- Matching extension icons are generated in `extension/icons/` at 16, 32, 48, 96, and 128 px.

## Screenshots

Upload files from `screenshots/` in numeric order. Each final screenshot is 1280×800:

1. `screenshot-01-library-overview.png` — session library and detailed window/tab view.
2. `screenshot-02-pinned-sessions.png` — pinned sessions filter.
3. `screenshot-03-automatic-recovery.png` — automatic and change-triggered restore points.
4. `screenshot-04-settings.png` — theme, notification, interval, and retention settings.
5. `screenshot-05-popup-quick-save.png` — compact popup and quick-save workflow.

The `screenshots/raw/` directory contains unprocessed browser captures and should not be uploaded.

## Promo tiles

- `promo/small-promo-tile-440x280.png` — small promo tile, 440×280.
- `promo/marquee-promo-tile-1400x560.png` — marquee promo tile, 1400×560.

Generated background sources are retained in `source/generated/` for future revisions.

## Promo video

A YouTube promo URL is not included. Recording, editing, uploading, and publishing a video is a separate step and requires a final approved build plus access to the destination YouTube channel.

## Rebuild

```sh
npm run build
node scripts/capture-store-assets.mjs
python scripts/prepare-store-assets.py --icons
python scripts/prepare-store-assets.py --screenshots
python scripts/prepare-store-assets.py --promos
```
