import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { VideoService } from "@/lib/services/video.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const comments = await VideoService.getCommentsForVideo(id);
    return ok(comments);
  } catch (error) {
    return handleApiError(error, "GET /api/videos/[id]/comments");
  }
}

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid comment", "VALIDATION_ERROR", 400);
    }

    const comment = await VideoService.addComment(id, user.id, parsed.data.content, parsed.data.parentId);
    if (!comment) {
      return fail("Video not found", "NOT_FOUND", 404);
    }

    return ok(comment, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/videos/[id]/comments");
  }
}
