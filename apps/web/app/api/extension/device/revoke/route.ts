import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { DeviceService } from "@/lib/services/device.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const revokeSchema = z.object({ deviceId: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const body = await request.json().catch(() => ({}));
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      return fail("deviceId is required", "VALIDATION_ERROR", 400);
    }

    await DeviceService.revokeDevice(parsed.data.deviceId, user.id);
    return ok(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke device";
    if (message === "Device not found") {
      return fail(message, "NOT_FOUND", 404);
    }
    return handleApiError(error, "POST /api/extension/device/revoke");
  }
}
