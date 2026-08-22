import { NextRequest } from "next/server";

import { getCurrentUser, getCurrentUserOrToken } from "@/lib/auth/server-auth";
import { UploadService } from "@/lib/services/upload.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const MIN_PART_SIZE = 5 * 1024 * 1024; // kept consistent with the old Vercel Blob constraint

/**
 * Chunked upload — step 2. Uploads one part (raw binary body). Upload
 * metadata travels in the query string:
 *   PUT /api/upload/part?uploadId=...&key=...&pathname=...&partNumber=1
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

    if (body.byteLength < MIN_PART_SIZE) {
      return fail(`Part must be at least ${MIN_PART_SIZE / 1024 / 1024}MB unless it is the final part`, "VALIDATION_ERROR", 400);
    }

    const part = await UploadService.uploadChunk(uploadId, partNumber, body);

    return ok({ part });
  } catch (error) {
    return handleApiError(error, "PUT /api/upload/part");
  }
}
