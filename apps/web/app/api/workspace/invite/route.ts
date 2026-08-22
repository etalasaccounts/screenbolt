import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!user.activeWorkspaceId) {
      return fail("No active workspace", "NOT_FOUND", 404);
    }

    const invite = await WorkspaceService.createInvite(user.id, user.activeWorkspaceId);
    return ok(invite, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/invite");
  }
}
