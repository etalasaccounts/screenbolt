import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }

    if (!user.activeWorkspaceId) {
      return fail("No active workspace", "NOT_FOUND", 404);
    }

    const result = await WorkspaceService.listMembers(user.id, user.activeWorkspaceId);
    return ok(result);
  } catch (error) {
    return handleApiError(error, "GET /api/workspace/members");
  }
}
