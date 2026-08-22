import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }
    const workspaces = await WorkspaceService.getWorkspacesForUser(user.id);
    return ok({ workspaces });
  } catch (error) {
    return handleApiError(error, "GET /api/workspaces");
  }
}
