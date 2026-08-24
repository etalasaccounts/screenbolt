import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { VideoService } from "@/lib/services/video.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const createVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  videoUrl: z.string().url("Invalid video URL").optional(),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional().nullable(),
  duration: z.number().nonnegative().optional().nullable(),
  source: z.enum(["local", "bunny", "drive", "dropbox"]).optional(),
  workspaceId: z.string().uuid().optional(),
  userTimestamp: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);
    if (!user.activeWorkspaceId) {
      return fail("No active workspace", "NO_ACTIVE_WORKSPACE", 400);
    }

    const { videos, timeSaved } = await VideoService.listVideos(user.activeWorkspaceId);

    return ok({ videos, timeSaved });
  } catch (error) {
    return handleApiError(error, "GET /api/videos");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const body = await request.json();
    const parsed = createVideoSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Validation error", "VALIDATION_ERROR", 400);
    }

    const workspaceId = parsed.data.workspaceId ?? user.activeWorkspaceId;
    if (!workspaceId) return fail("No active workspace", "NO_ACTIVE_WORKSPACE", 400);

    const video = await VideoService.createVideo({
      title: parsed.data.title,
      videoUrl: parsed.data.videoUrl ?? "",
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      duration: parsed.data.duration ?? null,
      source: parsed.data.source ?? "bunny",
      userId: user.id,
      workspaceId,
    });

    return ok(video, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/videos");
  }
}
