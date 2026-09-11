import { z } from "zod";
import { VideoService } from "@/lib/services/video.service";
import { ok, fail, handleApiError } from "@/lib/shared/api-response";

const schema = z.object({ pin: z.string() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid request body", "BAD_REQUEST", 400);

    const video = await VideoService.getVideo(id);
    if (!video) return fail("Not found", "NOT_FOUND", 404);
    if (!video.pinEnabled || !video.pin) return ok({}, 200);
    if (video.pin !== parsed.data.pin)
      return fail("Incorrect PIN", "INCORRECT_PIN", 401);
    return ok({}, 200);
  } catch (err) {
    return handleApiError(err, "POST /api/videos/[id]/pin/verify");
  }
}
