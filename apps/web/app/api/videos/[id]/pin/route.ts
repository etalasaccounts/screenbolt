import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { PinService } from "@/lib/services/pin.service";
import { ok, fail, handleApiError } from "@/lib/shared/api-response";

const schema = z.object({ enabled: z.boolean() });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid request body", "BAD_REQUEST", 400);

    const video = await PinService.setPin(user.id, id, parsed.data.enabled);
    return ok({ pin: video.pin, pinEnabled: video.pinEnabled }, 200);
  } catch (err) {
    return handleApiError(err, "PUT /api/videos/[id]/pin");
  }
}
