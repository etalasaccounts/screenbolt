# Architecture

## Overview

Screenbolt is a screen-recording SaaS with two independent components:

- **`apps/extension`** — Chrome extension for screen/camera capture, editing, and encoding.
- **`apps/web`** — Next.js SaaS backend and frontend: auth, workspaces, video dashboard, public sharing, cloud storage integration.

The apps use independent build systems and only communicate over HTTP. They do not share code (see "Separation" below).

## Repo layout

```
screenbolt-new/
├── apps/
│  ├── web/     Next.js app — own package.json, own node_modules
│  └── extension/   Chrome extension — own package.json, own node_modules, own webpack build
├── packages/
│  └── editor/    Shared recording-editor UI + video-processing ops (see "Shared code")
├── docs/
│  ├── architecture.md  (this file)
│  └── roadmap.md
└── CLAUDE.md     repo-wide house rules
```

Still no Turborepo/Nx/npm-workspaces-for-installing — `packages/editor` is
plain source with no build step or `package.json` of its own. Each app
resolves it via a path alias in its own bundler config (tsconfig `paths`
for Next.js/Turbopack, `resolve.alias` in `webpack.config.js`), not an
npm dependency. This keeps both apps' `npm install`/`node_modules` fully
independent — only module resolution is shared.

## Separation

The two apps never share source code except through the HTTP API contract.
This keeps them independent and allows independent deployment, scaling, and updates.

`packages/editor` is shared UI code used by both apps.

## Data Flow

1. User records via the extension (screen/tab/camera/desktop + audio). Capture and encoding happen locally in the extension.
2. User edits the recording in the extension's built-in editor (trim, crop, annotations, effects, camera bubble, etc.).
3. On export/save, the extension uploads the finished video to `apps/web`'s upload API using an auth token obtained via login handoff.
4. `apps/web` stores the video, creates a dashboard entry, and serves the public watch/share page.

The exact upload API contract is defined in the integration spec.

## Backend Layer Model (apps/web)

Strict layer separation prevents coupling and enforces a clear data flow. Seven named layers, each with defined responsibilities and import restrictions:

| Layer | Path | Responsibility | May import | Must not import |
|---|---|---|---|---|
| **Route** | `app/api/**/route.ts` | Auth check, input validation, call one service | `@/lib/services`, `@/lib/auth`, `@/lib/shared` | `@/lib/db`, `@/lib/integrations`, `drizzle-orm`, `postgres` |
| **Service** | `lib/services/*.service.ts` | Business logic, data transformation, call DB and integrations | `@/lib/db`, `@/lib/integrations`, `@/lib/shared` | other services, `next/server`, `drizzle-orm`, `postgres` |
| **Database** | `lib/db/*.ts` | Drizzle queries only | `drizzle-orm`, schema files | services, integrations, `next/server` |
| **Integration** | `lib/integrations/*.ts` | Vendor clients (Bunny, Google, Dropbox) — pure | vendor SDKs, `node:*` builtins, `@/lib/shared` | services, `@/lib/db`, `next/server` |
| **Auth adapter** | `lib/auth/*.ts` | NextAuth config, session loading, current-user lookup | `@/lib/db`, `@/lib/shared` | services, integrations |
| **Shared** | `lib/shared/*.ts` | Typed errors, success/failure envelopes, domain helpers | (nothing internal) | everything internal |
| **Client util** | `lib/client/*.ts` | DOM code, presentation formatters (browser-only) | React, DOM, `@/lib/shared` | db, services, integrations |

**Hooks** are React Query wrappers that sit between components and routes — they call routes via fetch, never touch services or the database.

**Components** call hooks or server components — never call services or touch the database directly.

Layer boundaries are enforced by eslint `no-restricted-imports` zones (checked by `npm run lint`) and route shape rules (checked by `npm run check:pattern`). See `PATTERN.md` for details.

## Tech Stack

**apps/web:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, NextAuth, Drizzle ORM + PostgreSQL (Neon), Bunny CDN for storage, Google Drive/Dropbox SDKs.

**apps/extension:** Chrome Manifest V3, webpack, React 18, fabric.js (canvas), mediabunny (encoding), Radix UI.

## Shared Code: `packages/editor`

The video editor (trim, crop, annotate, effects) is shared between both apps. Each app provides its own I/O adapter:

- **Video source:** `apps/extension` reads from IndexedDB; `apps/web` reads from blob URL
- **Export destination:** `apps/extension` uses chrome messaging; `apps/web` calls `/api/upload`

The shared code takes these as injected callbacks, so it runs unmodified in both webpack and Next.js.

## Sub-projects

See `docs/roadmap.md` for the full breakdown, sequencing, and which
sub-projects can run in parallel Herdr panes.
