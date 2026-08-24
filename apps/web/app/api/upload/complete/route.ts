import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserOrToken } from "@/lib/auth/server-auth";
import { assertVideoQuota, assertDurationAllowed } from "@/lib/billing/plans";
import { UploadService } from "@/lib/services/upload.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const completeSchema = z.object({
  uploadId: z.string().min(1),
  key: z.string().min(1),
  pathname: z.string().min(1),
  parts: z.array(z.object({ etag: z.string(), partNumber: z.number().int().positive() })).min(1),
  title: z.string().max(200).optional(),
  duration: z.number().nonnegative().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  workspaceId: z.string().optional(),
});

export const runtime = "nodejs";
/**
 * This is the one step whose cost scales with the video: it streams every
 * part back out of Bunny and into a single object. Vercel clamps this to the
 * plan's ceiling, so asking for the maximum is what sets the practical file
 * -size limit. Removing that limit means uploading straight to storage from
 * the browser, which Bunny Edge Storage cannot do safely (its only credential
 * is the zone-wide access key).
 */
export const maxDuration = 300;

/**
 * Chunked upload — step 3. Finalizes the multipart upload and creates the
 * video record in the active workspace.
 */
export async function POST(request: NextRequest) {
  // The server log only records a request once it finishes, so a stall here
  // is otherwise completely invisible: no line, no error, and a client stuck
  // at the last percentage it saw. These markers make the stalling step
  // identifiable from the log alone.
  const startedAt = Date.now();
  const since = () => `${Date.now() - startedAt}ms`;
  console.log("[POST /api/upload/complete] received");

  try {
    let user = await getCurrentUser();
    if (!user) user = await getCurrentUserOrToken(request);
    console.log(`[POST /api/upload/complete] authenticated after ${since()}`);
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);
    if (!user.activeWorkspaceId) return fail("No active workspace", "VALIDATION_ERROR", 400);

    if (!UploadService.checkStorageConfiguration()) {
      return fail("Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY/BUNNY_PULL_ZONE_HOST missing)", "SERVICE_UNAVAILABLE", 503);
    }

    await assertVideoQuota(user.id);

    const body = await request.json();
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Validation error", "VALIDATION_ERROR", 400);
    }

    if (parsed.data.duration != null) {
      await assertDurationAllowed(user.id, parsed.data.duration);
    }

    const result = await UploadService.completeChunkedUpload(
      parsed.data.uploadId,
      parsed.data.pathname,
      parsed.data.parts,
      user.id,
      parsed.data.workspaceId ?? user.activeWorkspaceId,
      parsed.data.title,
      parsed.data.duration ?? null,
      parsed.data.thumbnailUrl ?? null,
    );

    console.log(`[POST /api/upload/complete] assembled and recorded after ${since()}`);

    return ok({ url: result.url, video: result.video, service: "bunny" });
  } catch (error) {
    return handleApiError(error, "POST /api/upload/complete");
  }
}
