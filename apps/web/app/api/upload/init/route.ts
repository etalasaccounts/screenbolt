import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserOrToken } from "@/lib/auth/server-auth";
import { UploadService } from "@/lib/services/upload.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const initSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().optional(),
});

/**
 * Chunked upload — step 1. Initializes a multipart upload session and returns
 * the identifiers the client needs to upload parts.
 */
export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = await getCurrentUserOrToken(request);
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    if (!UploadService.checkStorageConfiguration()) {
      return fail("Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY/BUNNY_PULL_ZONE_HOST missing)", "SERVICE_UNAVAILABLE", 503);
    }

    const body = await request.json();
    const parsed = initSchema.safeParse(body);
    if (!parsed.success) {
      return fail("filename is required", "VALIDATION_ERROR", 400);
    }

    const result = await UploadService.initChunkedUpload(
      parsed.data.filename,
      parsed.data.contentType,
    );

    return ok({ uploadId: result.uploadId, key: result.key, pathname: result.pathname }, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/upload/init");
  }
}
