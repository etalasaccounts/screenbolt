import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { UserService } from "@/lib/services/user.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", "VALIDATION_ERROR", 400);
    }

    const updated = await UserService.updateProfile(user.id, parsed.data);

    return ok({ user: updated });
  } catch (error) {
    return handleApiError(error, "PATCH /api/user/profile");
  }
}
