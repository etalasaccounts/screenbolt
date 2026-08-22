import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserOrToken } from "@/lib/auth/server-auth";
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

/**
 * Chunked upload — step 3. Finalizes the multipart upload and creates the
 * video record in the active workspace.
 */
export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = await getCurrentUserOrToken(request);
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);
    if (!user.activeWorkspaceId) return fail("No active workspace", "VALIDATION_ERROR", 400);

    if (!UploadService.checkStorageConfiguration()) {
      return fail("Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY/BUNNY_PULL_ZONE_HOST missing)", "SERVICE_UNAVAILABLE", 503);
    }

    const body = await request.json();
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Validation error", "VALIDATION_ERROR", 400);
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

    return ok({ url: result.url, video: result.video, service: "bunny" });
  } catch (error) {
    return handleApiError(error, "POST /api/upload/complete");
  }
}
