import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { VideoService } from "@/lib/services/video.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const viewSchema = z.object({
  videoId: z.string().min(1),
  userId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();

    let sessionId = body.sessionId ?? null;
    if (!body.userId && !body.sessionId) {
      sessionId = randomUUID();
    }

    // Use provided userId, or fall back to authenticated user, or null
    const userId = body.userId ?? (user?.id ?? null);

    const parsed = viewSchema.safeParse({
      videoId: body.videoId,
      userId,
      sessionId,
    });

    if (!parsed.success) {
      return fail("Validation error", "VALIDATION_ERROR", 400);
    }

    const view = await VideoService.recordVideoView(parsed.data);
    return ok(view, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/video-views");
  }
}
