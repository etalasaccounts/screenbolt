import { getCurrentUser } from "@/lib/auth/server-auth";
import { CloudService } from "@/lib/services/cloud.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }
    const config = await CloudService.getCloudConnections(user.id);
    return ok(config);
  } catch (error) {
    return handleApiError(error, "GET /api/cloud-config");
  }
}
