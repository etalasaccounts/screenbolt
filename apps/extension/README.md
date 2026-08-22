# Screenbolt — Chrome extension

Screen capture, annotation, and editing Chrome extension for **Screenbolt**.
Licensed under **GPLv3** (see [`LICENSE`](./LICENSE) and [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)).

It is the `apps/extension` half of the Screenbolt product. The other half is
`apps/web` (the Next.js marketing site + SaaS shell). The two apps are
independent and only integrate over HTTP — see
[`../../docs/architecture.md`](../../docs/architecture.md) for the split and
the licensing boundary that depends on it.

## What it does

Record tab / screen / camera / custom region, with mic and system audio, an
in-browser annotation toolbar (fabric.js), a standalone editor (trim, crop,
mute, audio, GIF/MP4/WebM export), camera background effects, and local
encoding via `mediabunny` / `webm-duration-fix`. Everything runs locally in
the extension — no account required.

Manifest V3 architecture (inherited unchanged): background service worker,
content script, offscreen recorder, plus standalone `recorder`, `editor`,
`camera`, `region`, `setup`, and `cloudrecorder` pages, built with webpack.

## Prerequisites

- Node.js 18+ (built/tested on Node 22)
- Chrome (or Edge / Brave / any Chromium browser) for loading it unpacked

## Build

```bash
npm install        # installs deps, runs patch-package + scripts/patch-radix.js
npm run build:dev  # development build (source maps, no minification)
# or
npm run build      # production build (minified)
```

Both produce a loadable unpacked extension in `build/`. The dev build is what
you want for local work; `build:prod`/`build:release` produce the minified
build used for packaging (see "Not in scope" below).

## Load it unpacked

1. Build (see above), so `build/` exists.
2. Open `chrome://extensions`.
3. Toggle **Developer mode** (top right).
4. Click **Load unpacked** and select the `apps/extension/build/` folder.
5. Pin the extension, then click its icon to record.

Reload after each rebuild (the **↻** button on the extension card in
`chrome://extensions`), or run `npm run watch` / `npm run hot-reload` for a
dev-server workflow.

## Status & known gaps

Fork is landed and building (`npm run build:dev` produces a valid MV3
`build/manifest.json`). Remaining work is tracked in
[`../../docs/specs/02-extension-port.md`](../../docs/specs/02-extension-port.md).

- **Logo/icons** — (`src/assets/img/icon-*.png`, `src/assets/logo*.svg`,
  `favicon.png`). No suitable square Screenbolt icon exists in
  `apps/web/public/logo.svg` (it's a wide wordmark), so these are left as
  a placeholder.
- **Google OAuth client IDs** — the Drive "save to Drive" feature (manifest
  `oauth2.client_id` and the Edge client ID in
  `src/pages/Background/modules/signIn.js`; flagged with a `TODO(screenbolt)`
  there). Replace with Screenbolt's own client before any store release. Drive
  save is a cloud feature and effectively dormant for now anyway.
- **Help/support URLs** — Point these at real Screenbolt help/support
  pages when they exist.
- **Upload API** — sub-project 4 (`docs/specs/04-integration.md`) is landed
  on this side: device pairing (`chrome.runtime.sendMessage({type:
  "start-pairing"})`, also reachable from the popup's "..." settings menu)
  opens `${SCREENBOLT_API_BASE_URL || "http://localhost:3000"}/connect?code=...`,
  polls `GET /api/extension/pair/status`, and stores the resulting bearer
  token (`screenboltDeviceToken` in `chrome.storage.local`). The editor's
  Save panel has an "Upload to Screenbolt" button next to "Save to Drive"
  that POSTs the finished recording to `${SCREENBOLT_API_BASE_URL}/api/upload`
  with `Authorization: Bearer <token>`. This is gated by a *new*,
  dedicated `SCREENBOLT_ENABLE_WEB_UPLOAD` flag (default on; set to `"false"`
  to disable) — deliberately not the pre-existing `SCREENBOLT_ENABLE_CLOUD_FEATURES`
  flag. See `docs/specs/04-integration.md`'s status notes for what's wired vs.
  left for later (chunked upload for large files, live browser-driven verification).
- **Localization** — the English (`_locales/en`) strings are rebranded to Screenbolt.
- **Chrome Web Store packaging** — the `release:cws*` / `build:cws` /
  `preflight:cws` scripts are inherited but out of scope; local unpacked dev
  build only for now.
