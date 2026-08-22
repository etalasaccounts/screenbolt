# Screenbolt — Roadmap

Eight sub-projects. Each gets its own brainstorm → spec → implementation-plan
cycle before code is written (see `superpowers:brainstorming` /
`superpowers:writing-plans`) — this roadmap only tracks sequencing and
status, not implementation detail.

| # | Sub-project | Where | Depends on | Status |
|---|---|---|---|---|
| 1 | Landing page | `apps/web` | — | **done** |
| 2 | Extension port (the extension → Screenbolt) | `apps/extension` | — | **done** — fork landed & building; see `specs/02-extension-port.md` for known gaps |
| 3 | Web app shell (auth, workspaces, dashboard, watch/share, storage — free, no billing) | `apps/web` | — | **done** — full shell landed; see `specs/03-web-shell.md` for notes |
| 4 | Integration (upload API, auth handoff) | both | 2, 3 | **done** — both halves landed and the full pairing → token → upload-auth round-trip is curl-verified against the real dev server + Neon DB (upload passes auth/workspace; storage backend is now Bunny CDN, see `specs/04-integration.md`) |
| 5 | Extension control UI reskin | `apps/extension` | 2 | **done** — design mockup approved; all 10 sections resolved (01-09 styled to dark glass, section 10 investigated and deferred with rationale); see `specs/05-extension-control-ui.md` for details |
| 6 | Web-based screen recording | `apps/web` | 3, 4 | **done** — `/record` route, capture hook, and floating control bar; the editor it originally shipped with (a simplified reimplementation) has been replaced by sub-project 7's shared `packages/editor`, rendered in its own route/iframe (`app/record/editor-frame`); see `specs/06-web-recording.md` and `specs/07-shared-editor.md` |
| 7 | Shared editor extraction (`packages/editor`) | both | 2, 6 | **done** — real `EditorApp` UI (not just its video-processing math) now lives in shared `packages/editor`, used by both apps via their own video-source/save-destination adapters; both apps build clean (no browser available to verify at runtime); see `specs/07-shared-editor.md` for the honest list of known gaps |
| 8 | Authenticated dashboard visual redesign | `apps/web` | 3 | **done** — navbar, video library (`/home`), and account page restyled to match the landing page's established visual language; presentation-only, no functional changes; `tsc`/`eslint`/`build` all clean (no browser available to verify at runtime) |

Sub-projects 2 and 3 are being run unattended (Herdr panes, one pi agent
per sub-project, orchestrated from a main Claude session) — see their
spec files in `specs/` for what each is building and the stack
decisions already made, so anyone picking this up mid-flight has full
context without re-asking.

## 1. Landing page

Marketing site for `apps/web`, built from `apps/web/docs/design.html`.
No dependencies — start immediately.

## 2. Extension port

Fork the extension into `apps/extension`, strip/rebrand to Screenbolt, keep the
GPLv3 license scoped to this folder (see `architecture.md`). Can be spec'd
and built independently of sub-project 3 — stub the upload API until
sub-project 4.

## 3. Web app shell

Full SaaS shell in `apps/web`: auth, Stripe billing, workspaces, video
dashboard/library, public watch/share pages, Google Drive/Dropbox
integrations. Reference old Screenbolt's feature set and data model
(`/Users/riaenriala/Documents/etalas/screenbolt`), rebuild fresh. Can run
in parallel with sub-project 2.

**Status: done.** Auth (NextAuth credentials + Google), Drizzle schema on
Neon, dashboard/library, public watch page with comments + view tracking,
a chunked upload pipeline, Drive/Dropbox connect + save-to flows, and
privacy/terms pages are all implemented and building. See
`specs/03-web-shell.md` for what's deferred.

**Update (2026-08-20):** billing/Stripe removed entirely — Screenbolt is
free, no subscriptions for now — and storage swapped from Vercel Blob to
Bunny CDN. See `specs/03-web-shell.md`'s update note for details.

## 4. Integration

Define and wire the real upload API + auth token handoff between
`apps/extension` and `apps/web`. Sync point — needs 2 and 3 far enough
along that both sides can agree on the real contract instead of a stub.

## 6. Web-based screen recording

Record directly from `apps/web` via `getDisplayMedia`/`getUserMedia` +
`MediaRecorder` — no extension install required, matching Loom's web
recorder's scope (not extension parity). Depends on 3 (dashboard/watch
pages to land in) and 4 (the upload API contract this reuses). See
`specs/06-web-recording.md`. Editing now comes from sub-project 7's shared
`packages/editor` rather than the reimplemented UI this sub-project
originally shipped with.

## 7. Shared editor extraction

Correction pass on sub-project 6's editor. actual `EditorApp`
UI (layout/player, layout/editor, components) and its `mediabunny` video
ops now live in `packages/editor` — a plain shared source folder resolved
via bundler path aliases, no npm workspaces — so both `apps/extension` and
`apps/web` use the same real editor instead of one polished copy and one
improvised one. Each app supplies its own adapter for video-source loading
and save/export destination; the UI itself doesn't change between hosts.
See `specs/07-shared-editor.md` for the full extraction record, the
licensing note (this is the one deliberate GPLv3/proprietary sharing
exception, approved for this personal/portfolio project), and — important —
the honestly-documented list of known gaps (a React 18/19 version skew
between the two hosts' shared dependencies, a couple of chrome-messaging-only
secondary features that are inert on web, and the fact that none of it was
exercised in a real browser).

## 8. Authenticated dashboard visual redesign

Sub-project 3's web app shell was built functionality-first (auth, CRUD,
workspaces) with minimal styling effort — visually inconsistent with the
production-quality visual language sub-project 1 established for the
landing page. This sub-project is presentation-only: no changes to
data-fetching, auth, or any functional logic, just markup/styling brought
in line with `apps/web/components/landing/**` (Inter Tight + Instrument
Serif italic accents, `#f5f5f2`/`#090b0c` palette, pill-shaped buttons,
Solar icon set, frosted/blurred glass on floating elements, generous
whitespace, confident large type).

Covered: the site-wide authenticated navbar (`components/shell/navbar.tsx`),
the video library page (`app/(home)/home/page.tsx` and what it composes —
`video-card.tsx`, `upload-button.tsx`), and the account page
(`app/(home)/account/page.tsx` plus `cloud-connections.tsx`). Landed as
three incremental commits (navbar, home page, account page). Explicitly
out of scope and untouched: `components/record/**`, `lib/recording/**`,
`lib/editor/**`, `packages/editor/**` — concurrent tracks own those.

No browser-based testing was available; verified via `tsc --noEmit`,
`eslint`, and `next build`, all clean.

## Parallelization (Herdr)

Sub-projects 1, 2, and 3 have no file overlap and can each run in their own
Herdr pane once that sub-project has an approved spec. Sub-project 4 starts
only after 2 and 3 both reach a stub-compatible point — it's a sync/merge
step, not a fourth independent pane from day one.
