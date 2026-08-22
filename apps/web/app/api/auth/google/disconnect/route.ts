import { getCurrentUser } from "@/lib/auth/server-auth";
import { AuthService } from "@/lib/services/auth.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    await AuthService.disconnectGoogleDrive(user.id);

    return ok(null);
  } catch (error) {
    return handleApiError(error, "POST /api/auth/google/disconnect");
  }
}
