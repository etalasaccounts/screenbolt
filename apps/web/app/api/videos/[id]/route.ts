import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { VideoService } from "@/lib/services/video.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  videoUrl: z.string().url("Invalid video URL").optional(),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional().nullable(),
  duration: z.number().nonnegative().optional().nullable(),
  source: z.enum(["local", "bunny", "drive", "dropbox"]).optional(),
});

function serialize(video: Record<string, unknown> & { videoViews?: Array<{ id: string }> }) {
  return {
    id: video.id,
    title: video.title,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    duration: video.duration,
    source: video.source,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    views: video.videoViews?.length ?? 0,
    user: video.user,
    workspace: video.workspace,
    comments: video.comments,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const includeComments = new URL(request.url).searchParams.get("includeComments") === "true";

    const video = includeComments ? await VideoService.getVideoWithComments(id) : await VideoService.getVideo(id);
    if (!video) return fail("Video not found", "NOT_FOUND", 404);

    return ok(serialize(video));
  } catch (error) {
    return handleApiError(error, "GET /api/videos/[id]");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const existing = await VideoService.getVideo(id);
    if (!existing) return fail("Video not found", "NOT_FOUND", 404);
    if (existing.user.id !== user.id) return fail("Forbidden", "FORBIDDEN", 403);

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Validation error", "VALIDATION_ERROR", 400);
    }

    const video = await VideoService.updateVideo(id, parsed.data);

    return ok(video);
  } catch (error) {
    return handleApiError(error, "PUT /api/videos/[id]");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const existing = await VideoService.getVideo(id);
    if (!existing) return fail("Video not found", "NOT_FOUND", 404);
    if (existing.user.id !== user.id) return fail("Forbidden", "FORBIDDEN", 403);

    await VideoService.deleteVideo(id);
    return ok(null);
  } catch (error) {
    return handleApiError(error, "DELETE /api/videos/[id]");
  }
}
