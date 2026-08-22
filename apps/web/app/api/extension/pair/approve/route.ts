import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { DeviceService } from "@/lib/services/device.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const approveSchema = z.object({
  code: z.string().uuid(),
  label: z.string().max(120).optional(),
});

/**
 * Extension pairing — approve. Authenticated (session cookie). Approves a
 * pending request for the signed-in user's active workspace and mints a
 * device token. The raw token is returned once here (and again once via
 * status); it's stored hashed-only after this point.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);
    if (!user.activeWorkspaceId) {
      return fail("No active workspace", "VALIDATION_ERROR", 400);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return fail("code is required", "VALIDATION_ERROR", 400);
    }

    const result = await DeviceService.approvePairing(
      parsed.data.code,
      user.id,
      user.activeWorkspaceId,
      parsed.data.label,
    );

    return ok({ token: result.token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve pairing";
    if (message === "Pairing request not found") {
      return fail(message, "NOT_FOUND", 404);
    }
    if (message === "This device was already approved") {
      return fail(message, "CONFLICT", 409);
    }
    if (message.includes("Pairing request expired") || message.includes("already approved")) {
      return fail(message, "GONE", 410);
    }
    return handleApiError(error, "POST /api/extension/pair/approve");
  }
}
