import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserOrToken } from "@/lib/auth/server-auth";
import { assertVideoQuota, assertDurationAllowed } from "@/lib/billing/plans";
import { fail, handleApiError } from "@/lib/shared/api-response";
import { UploadService } from "@/lib/services/upload.service";

/**
 * Note this is not the effective ceiling on Vercel, which rejects any request
 * body over 4.5MB before the handler runs. Web clients slice anything larger
 * into parts (lib/client/chunked-upload.ts); this guard only still matters for
 * callers that post whole files, i.e. the Chrome extension.
 */
const MAX_SIZE = 500 * 1024 * 1024;

/**
 * Simple upload endpoint: accepts a single multipart `video` file (plus
 * optional `title`, `duration`, `workspaceId` fields and an optional
 * `thumbnail` image), stores it to Bunny CDN, and creates a video record
 * in the active workspace.
 *
 * For large files, use the chunked flow instead:
 *   POST /api/upload/init → PUT /api/upload/part (xN) → POST /api/upload/complete
 */
export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user) user = await getCurrentUserOrToken(request);
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);
    if (!user.activeWorkspaceId) return fail("No active workspace", "VALIDATION_ERROR", 400);

    if (!UploadService.checkStorageConfiguration()) {
      return fail(
        "Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY/BUNNY_PULL_ZONE_HOST missing)",
        "SERVICE_UNAVAILABLE",
        503,
      );
    }

    await assertVideoQuota(user.id);

    const formData = await request.formData();

    const video = formData.get("video");
    if (!(video instanceof File)) {
      return fail("No video file provided", "VALIDATION_ERROR", 400);
    }
    if (video.size > MAX_SIZE) {
      return fail(
        `File too large (${(video.size / 1024 / 1024).toFixed(1)}MB). Use the chunked upload API.`,
        "FILE_TOO_LARGE",
        413,
      );
    }

    const title = (formData.get("title") as string) || undefined;
    const duration = formData.get("duration") ? Number(formData.get("duration")) : null;
    if (duration && !isNaN(duration)) {
      await assertDurationAllowed(user.id, duration);
    }
    const workspaceId = (formData.get("workspaceId") as string) || user.activeWorkspaceId;

    // Optional thumbnail
    let thumbnail: File | null = null;
    const thumbnailField = formData.get("thumbnail");
    if (thumbnailField instanceof File && thumbnailField.type.startsWith("image/")) {
      thumbnail = thumbnailField;
    }

    const result = await UploadService.uploadSimple(
      video,
      user.id,
      workspaceId,
      title,
      duration && !isNaN(duration) ? duration : null,
      thumbnail,
    );

    return NextResponse.json(
      { success: true, url: result.url, video: result.video, service: "bunny" },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "POST /api/upload");
  }
}
