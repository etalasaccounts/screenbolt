import { getCurrentUser } from "@/lib/auth/server-auth";
import { UserService } from "@/lib/services/user.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }
    const userData = await UserService.getCurrentUser(user.id);
    return ok(userData);
  } catch (error) {
    return handleApiError(error, "GET /api/user");
  }
}
