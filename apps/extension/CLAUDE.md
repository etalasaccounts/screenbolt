# apps/extension — Screenbolt Chrome extension (GPLv3)

This folder is the Screenbolt browser extension. It stays under **GPLv3** (see `LICENSE`).

Read `../../docs/architecture.md` and `../../docs/roadmap.md` before doing
anything substantial here — this is sub-project 2 (see
`../../docs/specs/02-extension-port.md`).

## Licensing boundary — do not cross it

This folder is GPLv3. `apps/web` is proprietary. The two must never share
source — no copying files in either direction, no importing across the line.
They only integrate over the network API contract in `architecture.md`. If a
task seems to require sharing code, stop and flag it (it's a licensing call,
not an engineering one).

## Build & run

```bash
npm install          # installs deps; postinstall runs patch-package + scripts/patch-radix.js
npm run build:dev    # dev build -> build/ (source maps)
npm run build        # production build -> build/
```

Load `build/` as an unpacked extension in Chrome
(`chrome://extensions` → Developer mode → Load unpacked). There is no
browser-driven visual testing here — the acceptance bar is that the build
produces a valid MV3 `build/manifest.json` with no errors.

## Layout

- `src/manifest.json` — Manifest V3; transformed at build time by
  `webpack.config.js` (name/description come from `_locales`, version from
  `package.json`).
- `src/pages/*` — background service worker, content script, offscreen
  recorder, and standalone `recorder`/`editor`/`camera`/`region`/`setup`/
  `cloudrecorder` pages.
- `src/_locales/en/messages.json` — default-locale user-facing strings.
- `webpack.config.js` — entry points and build pipeline; env vars
  (`SCREENBOLT_*`) are baked via `DefinePlugin`.

## Rebranding notes

No trace of the original project's name is left in this codebase: all
internal identifiers that used to reference it (storage keys, env vars,
headers, DOM ids/classes, help-site URL slugs) have been renamed to
Screenbolt equivalents, and the two handlers that pointed at the original
project's own webstore listing and creator were removed rather than
renamed. This extension hasn't shipped yet (see known gaps below), so
there's no installed base carrying the old pre-rename storage keys to
migrate forward — if that changes before a store release, add a one-time
migration in `Background/index.js`'s `runUpgradeMigrations` before
renaming further.
User-facing strings are rebranded to "Screenbolt" in English only; other
locales weren't touched by this pass. See `README.md` for the full
known-gaps list (placeholder logo, Google OAuth
client IDs, placeholder help URLs, dormant cloud upload path).

## Process

This is a fork/port, not a greenfield build. Changes here follow the same
brainstorm → spec → plan discipline as the rest of the repo, but the durable
record is `../../docs/specs/02-extension-port.md` and the root `CLAUDE.md`
— don't re-litigate decisions recorded there.
