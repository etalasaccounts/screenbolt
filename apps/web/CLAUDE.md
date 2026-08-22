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
| **Route** | `app/api/**/route.ts` | One service + auth | Hooks/client | Auth + validation only |
| **Service** | `lib/services/*.service.ts` | DB + integrations, not other services | Routes, server components | Business logic only |
| **Database** | `lib/db/*.ts` | Drizzle queries only | Services | Queries only, no logic |
| **Integration** | `lib/integrations/*.ts` | Vendor SDKs (Bunny, Google, Dropbox) | Services | Pure functions, no DB |
| **Auth adapter** | `lib/auth/*.ts` | DB layer | Routes | NextAuth config + session load |
| **Shared** | `lib/shared/*.ts` | (nothing internal) | Any layer | Errors, envelopes, helpers |
| **Client util** | `lib/client/*.ts` | React, DOM | Components | Browser-only code |
| **Hook** | `lib/hooks/*.ts` | API routes via fetch | Components | React Query wrapper |

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

**New frontend component:** → `components/...tsx`
- Call a hook, never a service
- Hook calls `/api/...` via fetch

## Verification Checklist

Before any commit in `apps/web`:

```bash
npm test                  # Run tests (tests test services, mock DB)
npm run lint              # Layer boundaries (eslint)
npm run check:pattern     # Route shape (pattern checker)
npx tsc --noEmit          # Type safety
```

The pre-commit hook runs all four automatically.

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

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, NextAuth, Drizzle ORM, PostgreSQL (Neon), Bunny CDN, vitest.

## Further Reading

- `PATTERN.md` — all enforcement rules (read once per project)
- `docs/architecture.md` — system design (7-layer model)
- `docs/api-contract.md` — frozen extension contracts
