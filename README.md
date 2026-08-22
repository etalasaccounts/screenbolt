# Screenbolt

Screen recording SaaS. Record in your browser or via the Chrome extension, edit, and share.

## Quick Start

**Web app:**
```bash
cd apps/web
npm install
npm run dev
```

**Extension:**
```bash
cd apps/extension
npm install
npm run build
# Load dist/ in Chrome as unpacked extension
```

## Setup

- Copy `.env.example` to `.env.local` in `apps/web`
- Database schema is auto-migrated on startup
- Run `npm test` to verify everything works

## Project Layout

```
apps/web/           Next.js app (auth, dashboard, API)
apps/extension/     Chrome extension (capture, edit, upload)
packages/editor/    Shared video editor UI (both apps use this)
docs/               Design docs and specs
```

## Development

```bash
npm run dev          # Start web server
npm test             # Run tests
npm run lint         # Check code
npm run db:studio    # Inspect database
```

## Learn More

- **How to work here:** See `CLAUDE.md`
- **System design:** See `docs/architecture.md`
- **Features:** See `docs/specs/`
- **Plans:** See `docs/superpowers/plans/`

## Project Structure

Two independent apps communicating over HTTP only:

- `apps/web` — Next.js backend + frontend
- `apps/extension` — Chrome extension

Do not share code between them.
