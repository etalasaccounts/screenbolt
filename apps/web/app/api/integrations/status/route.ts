import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { CloudService } from "@/lib/services/cloud.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

/**
 * Returns whether each cloud provider is configured (app credentials present)
 * and connected (the current user has an access token).
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized", "UNAUTHORIZED", 401);

    const config = await CloudService.getCloudConnections(user.id);
    return ok(config);
  } catch (error) {
    return handleApiError(error, "GET /api/integrations/status");
  }
}
