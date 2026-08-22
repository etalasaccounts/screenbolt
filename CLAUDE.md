# Screenbolt

## Architecture

Two independent apps (HTTP-only integration):
- `apps/web` — Next.js backend + frontend
- `apps/extension` — Chrome extension
- `packages/editor` — Shared video editor

## Backend Pattern (apps/web)

Strict layer separation — never skip layers. Seven named layers enforce clear responsibilities:

```
Component → Hook → API Route → Service → Database
                   ↓
               Auth Adapter
                   ↓
               Shared Helpers
```

- **API route:** Auth check + input validation only. Calls exactly one service.
- **Service:** Business logic + data transformation. Calls DB and integrations, not other services.
- **Database:** Drizzle queries only. Zero business logic.
- **Integration:** Vendor clients (Bunny, Google, Dropbox) — pure, no DB access.
- **Auth adapter:** NextAuth config and session loading.
- **Shared:** Typed errors, response envelope, domain helpers — imports nothing internal.
- **Hook:** React Query wrapper only.

This pattern MUST be followed for every feature. Breaking it blocks code review.

Responses are typed envelopes: `{ success: true, data }` or `{ success: false, error: { message, code } }`. Three frozen external contracts (extension pairing + upload) retain their original response shape for backward compatibility with the Chrome Web Store.

**Enforcement:** Layer boundaries via eslint (9 zones), route shape via `check-pattern.mjs` (8 rules), both run by pre-commit hook. See `PATTERN.md` for all rules and current compliance numbers. See `apps/web/CLAUDE.md` for layer responsibilities at the point of use.

## Testing

Write tests for services (business logic lives there). Mock the database, not the API routes.

## Before Substantial Changes

Read `docs/architecture.md` for system design.

## Repository Conventions

- Git worktrees for isolation (`git worktree add .worktrees/feature-name -b feature-name`)
- Commit messages start with verb: "feat:", "fix:", "refactor:", "docs:"
