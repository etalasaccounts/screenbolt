import { NextRequest } from "next/server";

import { getCurrentUser, getCurrentUserOrToken } from "@/lib/auth/server-auth";
import { UploadService } from "@/lib/services/upload.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = await getCurrentUserOrToken(request);
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    if (!UploadService.checkStorageConfiguration()) {
      return fail("Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY/BUNNY_PULL_ZONE_HOST missing)", "SERVICE_UNAVAILABLE", 503);
    }

    const formData = await request.formData();

    const thumbnail = formData.get("thumbnail");
    if (!(thumbnail instanceof File)) {
      return fail("No thumbnail file provided", "VALIDATION_ERROR", 400);
    }
    if (!thumbnail.type.startsWith("image/")) {
      return fail("File must be an image", "VALIDATION_ERROR", 400);
    }
    if (thumbnail.size > 5 * 1024 * 1024) {
      return fail("Thumbnail must be less than 5MB", "VALIDATION_ERROR", 400);
    }

    const result = await UploadService.uploadThumbnail(thumbnail);

    return ok({ url: result.url, service: "bunny" });
  } catch (error) {
    return handleApiError(error, "POST /api/upload-thumbnail");
  }
}
