# apps/web — Backend Architecture

Next.js SaaS backend + frontend. Strict layer separation prevents coupling and makes the system predictable.

## The Seven-Layer Model

Every feature follows this stack (code review blocks violations):

```
Component → Hook → API Route → Service → Database
                   ↓
               Auth Adapter
                   ↓
               Shared Helpers
```

| Layer | Where | Calls | Called by | Key rule |
|---|---|---|---|---|
| **Route** | `app/api/**/route.ts` | One service + auth | Client code via fetch | Auth + validation only |
| **Service** | `lib/services/*.service.ts` | DB + integrations, not other services | Routes, server components | Business logic only |
| **Database** | `lib/db/*.ts` | Drizzle queries only | Services | Queries only, no logic |
| **Integration** | `lib/integrations/*.ts` | Vendor SDKs (Bunny, Google, Dropbox) | Services | Pure functions, no DB |
| **Auth adapter** | `lib/auth/*.ts` | DB layer | Routes | NextAuth config + session load |
| **Shared** | `lib/shared/*.ts` | (nothing internal) | Any layer | Errors, envelopes, helpers |
| **Client util** | `lib/client/*.ts` | React, DOM, api-fetch | Components | Browser-only code; API access via api-fetch |
| **Hook** | `lib/hooks/*.ts` | API routes via fetch (TanStack Query) | Components | React Query wrapper for caching only |

**Response envelope** (all non-frozen routes):
```typescript
// Success
{ success: true, data: <payload> }

// Failure
{ success: false, error: { message, code } }
```

Return via `ok(data)` / `fail(message, code, status)` / `handleApiError(error, context)` from `@/lib/shared/api-response`.

## Where to Put New Code

**New query (fetch user by ID):** → `lib/db/users.ts`
- Drizzle only, no business logic
- Services call it

**New business rule (charge subscription on signup):** → `lib/services/billing.service.ts`
- Call `lib/db/users.ts` to load, `lib/integrations/stripe.ts` to charge
- Routes call this service

**New vendor integration (Slack notifications):** → `lib/integrations/slack.ts`
- Pure client: `async function sendMessage(token, channel, text)`
- Services call it, pass the token

**New frontend component or page:** Choose the appropriate data path:

1. **Server component (layout.tsx, page.tsx)** — Call services directly
   - Pages, layouts, and Next.js special files (e.g., `sitemap.ts`) can import `@/lib/services/*` and call them synchronously
   - Used by 5 files today (app/(home)/layout.tsx, app/(home)/watch/[id]/page.tsx, app/(home)/connect/page.tsx, app/invite/[token]/page.tsx, app/sitemap.ts)
   - Best for static or slowly-changing server-only data

2. **Client mutations (form submit, delete, rename)** — Use `lib/client/api-fetch.ts` + refresh server state
   - Client components call `apiPost`, `apiPut`, `apiPatch`, or `apiFetch` from `@/lib/client/api-fetch`
   - After success, call `router.refresh()` to re-render server components with fresh data (most common pattern, about 11 components do this today)
   - Exception: Use `queryClient.invalidateQueries` only in components that already fetch data via React Query hooks (currently: components/shell/video-card.tsx, components/shell/upload-button.tsx)
   - Best for user-initiated changes that need to update the UI immediately

3. **React Query hooks** — Only where client-side caching or optimistic updates genuinely reduce requests
   - Wrap API calls in `useQuery` or `useMutation` from TanStack Query
   - Two hooks exist today (useVideos, useCurrentUser) — a deliberate choice, not under-adoption
   - Adding React Query everywhere would create a second cache competing with RSC caching
   - Best for frequently-accessed data with complex refetch strategies

## SEO & Metadata

Production domain is `https://screenbolt.com` — written verbatim in every canonical / OpenGraph / sitemap URL. `metadataBase` in `app/layout.tsx` resolves relative asset paths (e.g. `/opengraph-image.png`) to absolute URLs, which social scrapers require.

**Critical — indexable pages must be allowlisted.** The NextAuth middleware (`proxy.ts`) guards everything except the `isPublic` list in `lib/auth/config.ts`. Static assets (any path containing a dot — `/opengraph-image.png`, `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`) are excluded by the matcher regex and are always reachable. Marketing **pages** are not: a path with no dot runs through `authorized()`, so **any new public page MUST be added to `isPublic` or the middleware 307-redirects it to `/login` — invisible to crawlers even while it sits in the sitemap.** Keep `isPublic` and `app/sitemap.ts` in sync. Current public pages: `/`, `/login`, `/signup`, `/terms`, `/privacy`, `/blogs`, `/blogs/*`, `/watch/*`, `/embed/*`, `/invite/*`.

**Where each concern lives:**

| Concern | Where | Notes |
|---|---|---|
| Global metadata | `app/layout.tsx` → `metadata` | Title template `%s — Screenbolt`, default title/description, keywords, OG, Twitter, `metadataBase` |
| Per-page metadata | Each page's `export const metadata` or `generateMetadata` | Always set `alternates.canonical` to the absolute URL |
| OG / Twitter image | `public/opengraph-image.png` (static, 1536×1024) | Referenced as `/opengraph-image.png`. Do **not** re-add a code-generated `app/opengraph-image.tsx` — it emits duplicate `og:image` tags |
| Sitemap | `app/sitemap.ts` | `revalidate = 3600`; merges static pages + blog (`listBlogPosts`) + public videos (`VideoService.listPublicVideos`) |
| Robots | `app/robots.ts` | Allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, …) on public paths; disallows `/d*` and `/api*` |
| PWA manifest | `app/manifest.ts` | Served at `/manifest.webmanifest` |
| LLM guide | `public/llms.txt` | Static pointer file for LLM crawlers |
| Structured data | `<script type="application/ld+json">` inside the page component | `SoftwareApplication` on home, `BlogPosting` on blog posts |

**Blog content is file-based, not a DB table.** `lib/blog/posts.json` is read through `lib/blog/blog.ts` (`listBlogPosts` / `getBlogPost` / `listBlogSlugs`), and blog pages are statically generated via `generateStaticParams`. Add a post by appending to `posts.json` — the sitemap and static params pick it up automatically. Note this is a deliberate exception to the seven-layer model: blog copy is editorial content, so it lives in a JSON file rather than behind a service + `lib/db` query.

**`next/image` rules** (enforced only by console warnings, so easy to regress):
- `logo.svg` is intrinsically **613×93** — every `<Image>` of it must pass `width={613} height={93}`; rendered size stays controlled by the `className` (fixed height + `w-auto`).
- Every `fill` image needs a `sizes` prop matching its layout column, and its nearest positioned ancestor must actually be positioned (`relative`/`absolute`) — a `display:contents` wrapper (e.g. `className="contents"`) does not count.

## Verification Checklist

Before any commit in `apps/web`:

```bash
npm test                  # Run tests (tests test services, mock DB)
npm run lint              # Layer boundaries (eslint)
npm run check:pattern     # Route shape (pattern checker)
npm run typecheck         # Type safety (next typegen + tsc --noEmit)
```

**Note:** The pre-commit hook runs only `npm run lint` and `npm run check:pattern` on staged files. Tests and type-checking do not run on the hook; they are verified in CI. This keeps the local hook fast while still catching layer violations immediately.

## Common Patterns

### Fetch + return

```typescript
// Route
import { getCurrentUser } from "@/lib/auth/server-auth";
import { VideoService } from "@/lib/services/video.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }
    
    const videos = await VideoService.listVideos(user.id);
    return ok(videos);
  } catch (error) {
    return handleApiError(error, "GET /api/videos");
  }
}
```

### POST with validation

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { VideoService } from "@/lib/services/video.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const createSchema = z.object({ title: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }
    
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Title is required", "VALIDATION_ERROR", 400);
    }
    
    const video = await VideoService.createVideo({
      title: parsed.data.title,
      videoUrl: "https://...",
      userId: user.id,
      workspaceId: user.activeWorkspaceId,
    });
    return ok(video, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/videos");
  }
}
```

### Service calling DB + integration

```typescript
// lib/services/video.service.ts
import { createVideo as dbCreateVideo } from "@/lib/db/videos";
import { uploadToBunny } from "@/lib/integrations/bunny";

export class VideoService {
  static async uploadVideo(file: File, userId: string, workspaceId: string) {
    // Validate
    if (file.size > MAX_SIZE) throw new ValidationError("File too large");
    
    // Upload to vendor
    const url = await uploadToBunny(file);
    
    // Delegate to DB layer
    return dbCreateVideo({
      title: file.name,
      videoUrl: url,
      userId,
      workspaceId,
      source: "bunny",
    });
  }
}
```

## Frozen Contracts

Three routes are frozen (never enveloped, extension reads top-level keys):

- `POST /api/extension/pair/init`
- `GET /api/extension/pair/status`
- `POST /api/upload`

See `docs/api-contract.md` for their exact shapes.

## Client-Side API Access — `lib/client/api-fetch.ts`

All client code uses `@/lib/client/api-fetch` for API calls. Raw `fetch()` calls are not used in components.

**Error type:**
- `ApiClientError` — thrown by all api-fetch functions on HTTP error or network failure; carries `message`, `code`, and `status` properties

**Main enveloped helper:**
- `apiFetch<T>(path, options?)` — Calls any API route with the standard envelope. Unwraps `{ success: true, data }` responses and throws `ApiClientError` on failure with the server's error code and message preserved.

**JSON mutation helpers (sets Content-Type: application/json):**
- `apiPost<T>(path, body, options?)`
- `apiPut<T>(path, body, options?)`
- `apiPatch<T>(path, body, options?)`

**Frozen contract helper:**
- `apiFetchRaw<T>(path, options?)` — Call ONLY for the three frozen routes (extension pairing and upload). Returns the raw top-level JSON with NO envelope unwrapping. Do not use this for any other route.

All functions throw `ApiClientError` on failure, with identical error handling across enveloped and frozen routes: the server's error message and code are preserved, or an HTTP status fallback is used if the envelope is missing.

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, NextAuth, Drizzle ORM, PostgreSQL (Neon), Bunny CDN, vitest.

## Further Reading

- `PATTERN.md` — all enforcement rules (read once per project)
- `docs/architecture.md` — system design (7-layer model)
- `docs/api-contract.md` — frozen extension contracts

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
