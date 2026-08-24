import { NextRequest } from "next/server";

import { getCurrentUser, getCurrentUserOrToken } from "@/lib/auth/server-auth";
import { UploadService } from "@/lib/services/upload.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

/**
 * Vercel caps a serverless function's request body at 4.5MB and there is no
 * setting to raise it, so this is the real ceiling on a part. The client
 * slices at 4MB (see lib/client/chunked-upload.ts) to leave headroom for
 * request overhead; anything above the cap never reaches this handler at all,
 * it is rejected by the platform.
 */
const MAX_PART_SIZE = 4.5 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Chunked upload — step 2. Uploads one part (raw binary body). Upload
 * metadata travels in the query string:
 *   PUT /api/upload/part?uploadId=...&key=...&pathname=...&partNumber=1
 *
 * DELETE with the same uploadId discards an abandoned upload's parts.
 */
export async function PUT(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = await getCurrentUserOrToken(request);
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    if (!UploadService.checkStorageConfiguration()) {
      return fail("Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY/BUNNY_PULL_ZONE_HOST missing)", "SERVICE_UNAVAILABLE", 503);
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");
    const key = searchParams.get("key");
    const pathname = searchParams.get("pathname");
    const partNumber = Number(searchParams.get("partNumber"));

    if (!uploadId || !key || !pathname || !Number.isInteger(partNumber) || partNumber < 1) {
      return fail("uploadId, key, pathname and partNumber are required", "VALIDATION_ERROR", 400);
    }

    const body = await request.arrayBuffer();

    if (body.byteLength === 0) {
      return fail("Part is empty", "VALIDATION_ERROR", 400);
    }
    if (body.byteLength > MAX_PART_SIZE) {
      return fail(
        `Part must be at most ${(MAX_PART_SIZE / 1024 / 1024).toFixed(1)}MB`,
        "VALIDATION_ERROR",
        413,
      );
    }

    const part = await UploadService.uploadChunk(uploadId, partNumber, body);

    return ok({ part });
  } catch (error) {
    return handleApiError(error, "PUT /api/upload/part");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = await getCurrentUserOrToken(request);
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const uploadId = new URL(request.url).searchParams.get("uploadId");
    if (!uploadId) {
      return fail("uploadId is required", "VALIDATION_ERROR", 400);
    }

    await UploadService.abortChunkedUpload(uploadId);

    return ok({ aborted: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/upload/part");
  }
}
