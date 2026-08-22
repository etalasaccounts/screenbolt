# API Route Pattern — Enforcement Guide

**This file describes what is mechanically enforced.** The request path is Component → Hook → API Route → Service → Database, with Integration, Auth adapter, Shared, and Client as additional named layers. See `docs/architecture.md` for the complete 7-layer model and `apps/web/CLAUDE.md` for layer responsibilities.

## Enforcement

Two hard-failing checks, both run by the pre-commit hook on staged files:

```bash
cd apps/web
npm run lint             # layer boundaries (eslint no-restricted-imports)
npm run check:pattern    # route shape (scripts/check-pattern.mjs)
```

The pre-commit hook is wired via `core.hooksPath` and installs automatically on `npm install` in `apps/web`. To install manually:

```bash
git config core.hooksPath .githooks
```

It checks **staged files only**, so pre-existing violations elsewhere don't block unrelated commits. Bypass with `git commit -n` only for work already known to be non-compliant.

## Layer Boundary Enforcement — `npm run lint`

Nine eslint `no-restricted-imports` zones in `apps/web/eslint.config.mjs`:

| Zone | Deny list |
|---|---|
| `app/api/**/route.ts` | `@/lib/db`, `@/lib/db/**`, `drizzle-orm*`, `postgres`, `@/lib/integrations/**` |
| `lib/services/**` | `@/lib/services/**`, other services, `next/server`, `@/lib/hooks/**`, `drizzle-orm`, `drizzle-orm/**`, `postgres` |
| `lib/db/**` | `@/lib/services/**`, `@/lib/integrations/**`, `next/server` |
| `lib/integrations/**` | `@/lib/services/**`, `next/server`, `@/lib/db`, `@/lib/db/**` |
| `lib/auth/**` | `@/lib/services/**`, `@/lib/integrations/**` |
| `lib/hooks/**` | `@/lib/services/**`, `@/lib/db**` |
| `lib/client/**` | `@/lib/db`, `@/lib/db/**`, `@/lib/services/**`, `@/lib/integrations/**` |
| `components/**`, `app/**/*.tsx` | `@/lib/services/**`, `@/lib/db`, `@/lib/db/**` |
| `app/**/page.tsx`, `app/**/layout.tsx` | `@/lib/db`, `@/lib/db/**` (server components can call services) |

## Route Shape Enforcement — `npm run check:pattern`

Per route, enforced via regex patterns in `apps/web/scripts/check-pattern.mjs`:

### File-level rules (one check per file):

- **`service`** — imports exactly one `@/lib/services/*` service AND actually calls it (not a dead import)
- **`auth`** — calls `getCurrentUser()` and the guard block contains a `return` statement (not an empty if)
- **`contract-frozen` (frozen routes only)** — does not import envelope functions (`ok()`, `fail()`, `handleApiError()`) and response shape matches the recorded fixture

### Handler-level rules (per HTTP method):

- **`try-catch`** — every handler wrapped in try/catch
- **`error-handling`** — catch block calls `console.error()` OR `handleApiError()`
- **`zod`** — POST/PATCH/PUT that read a body validate it with `.safeParse()`
  - Only required where body is genuinely read (not on bodyless routes like disconnect/revoke)
- **`response-shape`** — non-redirect failures return `{ error: ... }`, `fail()`, or `handleApiError()`
- **`envelope`** — non-redirect, non-exempt routes return through `ok()` or `handleApiError()`
- **`no-manual-status`** — no hand-built `NextResponse.json({ error }, { status })` patterns outside frozen routes

Redirects (detected by content: `NextResponse.redirect()`) skip the `response-shape` and `envelope` rules.

## Exemptions

Exemptions are declared explicitly in `EXEMPT` at the top of `apps/web/scripts/check-pattern.mjs`, each with a reason. The list as of this document:

```
"app/api/auth/[...nextauth]/route.ts": rules: "*"
  → Three-line re-export of NextAuth handlers; no handler body to inspect

"app/api/auth/signup/route.ts": rules: ["auth"]
  → Public endpoint: signup creates the user, so no caller to authenticate

"app/api/video-views/route.ts": rules: ["auth"]
  → Public endpoint: records views on shared videos (anonymous viewers)

"app/api/extension/pair/init/route.ts": rules: ["auth", "envelope", "no-manual-status"]
  → Public endpoint (unpaired extension) + frozen external contract

"app/api/extension/pair/status/route.ts": rules: ["auth", "envelope", "no-manual-status"]
  → Public endpoint (code is the bearer credential) + frozen external contract

"app/api/upload/route.ts": rules: ["envelope", "no-manual-status"]
  → Frozen external contract (extension and web clients)
```

## Reference Implementation

```typescript
import { getCurrentUser } from "@/lib/auth/server-auth";
import { UserService } from "@/lib/services/user.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const data = await UserService.getCurrentUser(user.id);
    return ok(data);
  } catch (error) {
    return handleApiError(error, "GET /api/user");
  }
}
```

For POST/PATCH/PUT, add a zod schema and call `.safeParse()` on the body:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { ItemService } from "@/lib/services/item.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const createSchema = z.object({ name: z.string() });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid request body", "VALIDATION_ERROR", 400);
    }

    const data = await ItemService.create(user.id, parsed.data);
    return ok(data, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/items");
  }
}
```

## Current Status (measured, not aspirational)

From `apps/web`, after running all verifications:

- **Routes:** 30 total — 29 compliant, 0 violating, 1 exempt
- **ESLint:** 4 errors (3 × `no-html-link-for-pages`, 1 × `no-explicit-any` in `user.service.ts`), 5 warnings — all pre-existing and unrelated to the layer pattern
- **TypeScript:** clean (no type errors)
- **Test files:** 14, 202 tests passing

### Rules That Resist Being Gamed

Three checks were tightened after patterns satisfied them without satisfying intent. If tempted by these, the checker will reject:

- **Dead service import:** A service import that is never called. The service must actually be **used** (e.g., `UserService.getUser()`, not just `import { UserService }` with no call).
- **Empty guard block:** `if (!user) {}` with no return. The guard must actually **return** (e.g., `if (!user) return ...`); an empty block authenticates nothing.
- **Fake body reads:** `request.json()` added to a bodyless route just to satisfy zod. Calling `request.json()` on an empty body throws, turning a working 200 into a 500. Zod is required only where a body is genuinely read.

A route that genuinely cannot satisfy a rule belongs in `EXEMPT` with a written reason, never in a workaround.

## Error Handling — Typed Errors and Envelopes

All 22 enveloped routes (non-frozen, non-exempt) return through `ok()` or `handleApiError()`:

- **Success:** `{ success: true, data: <payload> }` via `ok(data, status?)`
- **Failure:** `{ success: false, error: { message, code } }` via `fail(message, code, status)` or `handleApiError(error, context)`

Services throw typed errors from `@/lib/shared/errors`:
- `ApiError` (abstract base class; status and code are required constructor arguments supplied by subclasses)
- `ValidationError` (status 400, code `'VALIDATION_ERROR'`)
- `UnauthorizedError` (status 401, code `'UNAUTHORIZED'`)
- `NotFoundError` (status 404, code `'NOT_FOUND'`)
- `ConflictError` (status 409, code `'CONFLICT'`)
- `ForbiddenError` (status 403, code `'FORBIDDEN'`)
- `BadGatewayError` (status 502, code `'BAD_GATEWAY'`)
- `InternalServerError` (status 500, code `'INTERNAL_SERVER_ERROR'`)

Routes never hand-build status codes or error shapes — they delegate error mapping to `handleApiError()`, which:
1. Maps typed `ApiError` subclasses to their HTTP status codes
2. Wraps the response in the failure envelope
3. Logs unexpected errors (non-ApiError) to `console.error` with context
4. **Does NOT leak unexpected error messages to clients** — returns a generic "An unexpected error occurred" to prevent exposing stack traces or connection strings

Typed error handling prevents silent bugs: a status code mismatch or wrong envelope shape is now caught by the checker.

## Frozen External Contracts

Three routes have a **frozen external contract** — their response shape is locked in place and never enveloped because the Chrome extension reads their top-level keys directly:

- `POST /api/extension/pair/init`
- `GET /api/extension/pair/status`
- `POST /api/upload`

See `docs/api-contract.md` for their exact request/response shapes and extension consumer line numbers.

The `contract-frozen` rule verifies:
1. No import of envelope functions
2. Top-level JSON keys and status codes match the fixture in `scripts/frozen-contracts.json`

If a contract must change (a breaking change), all three must be updated in lockstep, along with the extension source code — then both must go through their respective deployment pipelines (Web Store review lag is 1–3 days, so coordination is required).

## Verification Commands

Run from `apps/web` after every task:

```bash
npm test                       # vitest; all tests pass
npm run lint                   # 0 no-restricted-imports violations
npm run check:pattern          # all routes compliant
npx tsc --noEmit              # no type errors
```

These are sequential checks; any failure blocks the next one. The pre-commit hook runs all four on staged files.

## Pre-commit Hook

The hook is installed by `npm install` (postinstall script in `apps/web/package.json`). It runs on staged files only (not the whole repo), so:

- Committing an unrelated change doesn't fail due to old violations elsewhere
- Every commit leaves the codebase incrementally cleaner
- Bypass is documented (`git commit -n`) for emergencies, never the default

The hook wires both checks together:

```bash
#!/bin/bash
# .githooks/pre-commit
cd "$(git rev-parse --show-toplevel)/apps/web"
npm run lint && npm run check:pattern
```
