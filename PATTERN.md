# API Route Pattern — Enforcement Guide

**This file describes what is mechanically enforced.** The request path is Component → Hook → API Route → Service → Database, with Integration, Auth adapter, Shared, and Client as additional named layers. See `docs/architecture.md` for the complete 7-layer model and `apps/web/CLAUDE.md` for layer responsibilities.

## Enforcement

Two hard-failing checks run by the pre-commit hook on staged files:

```bash
cd apps/web
npm run lint             # layer boundaries (eslint no-restricted-imports)
npm run check:pattern    # route shape (scripts/check-pattern.mjs)
```

**Note:** The pre-commit hook runs **only** these two checks on staged files. Tests and type-checking do not run on the hook and can pass without running locally. CI (see CI section below) is the authoritative enforcement and runs all four checks.

The pre-commit hook is wired via `core.hooksPath` and installs automatically on `npm install` in `apps/web`. To install manually:

```bash
git config core.hooksPath .githooks
```

It checks **staged files only**, so pre-existing violations elsewhere don't block unrelated commits. Bypass with `git commit -n` only for work already known to be non-compliant.

## Layer Boundary Enforcement — `npm run lint`

Twelve eslint `no-restricted-imports` zones in `apps/web/eslint.config.mjs`:

| Zone | Deny list |
|---|---|
| `app/**/*.ts` | `@/lib/db`, `@/lib/db/**`, `drizzle-orm*`, `postgres`, `@/lib/integrations/**` (server .ts files like sitemap.ts, robots.ts, manifest.ts can call services but not db/integrations) |
| `app/api/**/route.ts` | `@/lib/db`, `@/lib/db/**`, `drizzle-orm*`, `postgres`, `@/lib/integrations/**` (API routes delegate to services) |
| `lib/services/**` | `@/lib/services/**`, other services, `next/server`, `@/lib/hooks/**`, `drizzle-orm`, `drizzle-orm/**`, `postgres` |
| `lib/db/**` | `@/lib/services/**`, `@/lib/integrations/**`, `next/server` |
| `lib/integrations/**` | `@/lib/services/**`, `next/server`, `@/lib/db`, `@/lib/db/**` |
| `lib/auth/**` | `@/lib/services/**`, `@/lib/integrations/**` |
| `lib/hooks/**` | `@/lib/services/**`, `@/lib/db**` |
| `lib/client/**` | `@/lib/db`, `@/lib/db/**`, `@/lib/services/**`, `@/lib/integrations/**` |
| `lib/recording/**` | `@/lib/db`, `@/lib/db/**`, `@/lib/services/**`, `@/lib/integrations/**` (browser-only utilities for getUserMedia, getDisplayMedia, etc.) |
| `lib/editor/**` | `@/lib/db`, `@/lib/db/**`, `@/lib/services/**`, `@/lib/integrations/**` (browser-only editor adapters) |
| `components/**`, `app/**/*.tsx` | `@/lib/services/**`, `@/lib/db`, `@/lib/db/**`, `@/lib/integrations/**` |
| `app/**/page.tsx`, `app/**/layout.tsx` | `@/lib/db`, `@/lib/db/**`, `@/lib/integrations/**` (server components can call services; declared last so rules win) |

## Route Shape Enforcement — `npm run check:pattern`

Per route, enforced via regex patterns in `apps/web/scripts/check-pattern.mjs`:

### File-level rules (one check per file):

- **`service`** — imports exactly one `@/lib/services/*` service (the "service is actually called" check is per-handler)
- **`contract-frozen` (frozen routes only)** — does not import envelope functions (`ok()`, `fail()`, `handleApiError()`) and response shape matches the recorded fixture

### Handler-level rules (per HTTP method):

- **`auth`** — calls `getCurrentUser()` and the guard block contains a `return` statement (not an empty if)
- **`service`** — actually calls the imported service in this handler (not a dead import; prevents a handler from delegating nothing)
- **`try-catch`** — every handler wrapped in try/catch
- **`error-handling`** — catch block calls `console.error()` OR `handleApiError()`
- **`zod`** — POST/PATCH/PUT that read a body validate it with `.safeParse()`
  - Only required where body is genuinely read (not on bodyless routes like disconnect/revoke)
- **`response-shape`** — non-redirect failures return `{ error: ... }`, `fail()`, or `handleApiError()`
- **`envelope`** — non-redirect, non-exempt routes return through `ok()` or `handleApiError()`
- **`no-manual-status`** — no hand-built `NextResponse.json({ error }, { status })` patterns outside frozen routes

Redirects (detected by content: `NextResponse.redirect()`) skip the `response-shape` and `envelope` rules.

## Exemptions

Exemptions are declared explicitly in `EXEMPT` at the top of `apps/web/scripts/check-pattern.mjs`, each with a reason. Rules may be exempted in two forms:

- **Plain rule name** (e.g., `"auth"`) — exempts the rule for **all** handlers in the file. Use sparingly; a plain `"auth"` exemption silences the rule for DELETE and PUT handlers too.
- **Per-handler rule** (e.g., `"auth:GET"`, `"envelope:POST"`, `"service:DELETE"`) — exempts the rule only for the named HTTP method. This syntax works for every rule, not just `auth`. Strongly preferred when only one handler is public (e.g., a GET that reads shared data but POST that creates).

The checker warns to stderr if a rule name or handler name is misspelled (e.g., `"envelop:GET"` or `"auth:GTE"`) — the typo'd entry silently matches nothing and provides no exemption.

The list as of this document (8 entries):

```
"app/api/auth/[...nextauth]/route.ts": rules: "*"
  → Three-line re-export of NextAuth handlers; no handler body to inspect

"app/api/auth/signup/route.ts": rules: ["auth"]
  → Public endpoint: signup creates the user, so no caller to authenticate

"app/api/video-views/route.ts": rules: ["auth"]
  → Public endpoint: records views on shared videos (anonymous viewers)

"app/api/videos/[id]/route.ts": rules: ["auth:GET"]
  → GET is public: fetches video detail for shared video links; PUT and DELETE require authentication

"app/api/videos/[id]/comments/route.ts": rules: ["auth:GET"]
  → GET is public: fetches comments on shared videos; POST requires authentication

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

- **Routes:** 31 total — 30 compliant, 0 violating, 1 exempt
- **ESLint:** 0 errors, 0 warnings
- **TypeScript:** clean (no type errors)
- **Test files:** 17, 286 tests passing

### Rules That Resist Being Gamed

Several checks were tightened after patterns satisfied them without satisfying intent. If tempted by these, the checker will reject:

- **Per-handler auth:** The `auth` rule runs on every HTTP method in the file, not just once for the file. A DELETE or PUT with no auth guard used to pass if a GET in the same file had `getCurrentUser()`. Now each handler must authenticate independently. This prevents subtle security gaps where one handler leaks data while others protect it.
- **Dead service import:** A service import that is never called in a handler. The service must actually be **used** (e.g., `UserService.getUser()`, not just `import { UserService }` with no call).
- **Empty guard block:** `if (!user) {}` with no return. The guard must actually **return** (e.g., `if (!user) return ...`); an empty block authenticates nothing.
- **Fake body reads:** `request.json()` added to a bodyless route just to satisfy zod. Calling `request.json()` on an empty body throws, turning a working 200 into a 500. Zod is required only where a body is genuinely read.

A route that genuinely cannot satisfy a rule belongs in `EXEMPT` with a written reason, never in a workaround.

## Error Handling — Typed Errors and Envelopes

All 27 enveloped routes (non-frozen, non-exempt) return through `ok()` or `handleApiError()`:

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

These are sequential checks; any failure blocks the next one. The pre-commit hook runs only lint and check:pattern on staged files (tests and type-checking happen in CI).

## Pre-commit Hook

The hook is installed by `npm install` (postinstall script in `apps/web/package.json`). It runs on staged files only (not the whole repo), so:

- Committing an unrelated change doesn't fail due to old violations elsewhere
- Every commit leaves the codebase incrementally cleaner
- Bypass is documented (`git commit -n`) for emergencies, never the default

The hook wires eslint and check-pattern together:

```bash
#!/bin/bash
# .githooks/pre-commit
cd "$(git rev-parse --show-toplevel)/apps/web"
npm run lint && npm run check:pattern
```

The hook runs **only** these two checks. Tests and type-checking are **not** run on the hook — they happen in CI. This keeps the local hook fast (roughly a second on a single staged file, dominated by eslint startup) while still catching layer violations immediately. Commits can pass the hook with failing tests or type errors; CI is the authoritative enforcement that requires branch protection to block merging.

## CI — The Authoritative Check

`.github/workflows/ci.yml` runs on every push and pull request to all branches. It runs all four verifications as separate steps on Node 22:

1. **Lint** — `npm run lint` (no `if:` condition; uses default)
2. **Check pattern** — `npm run check:pattern`
3. **Run tests** — `npm test`
4. **Type check** — `npx tsc --noEmit`

The workflow declares top-level `permissions: contents: read` to limit token scope, and a `concurrency` block that cancels superseded runs on every ref except `main` to avoid redundant work on rapidly-pushed branches. After `npm ci` succeeds, Lint runs first with the default condition (`success()`), while the remaining three checks (Check pattern, Run tests, Type check) run with `if: ${{ !cancelled() && steps.install.outcome == 'success' }}` to ensure each reports its findings even if an earlier check fails, so a single CI run captures every problem. If `npm ci` fails, all checks are skipped (they cannot run without dependencies). CI makes all violations visible on every push and PR; blocking merges additionally requires enabling branch protection on `main` in GitHub settings.
