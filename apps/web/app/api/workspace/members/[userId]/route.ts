import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

type RouteContext = { params: Promise<{ userId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }

    if (!user.activeWorkspaceId) {
      return fail("No active workspace", "NOT_FOUND", 404);
    }

    const { userId } = await context.params;

    const result = await WorkspaceService.removeMember(user.id, user.activeWorkspaceId, userId);
    return ok(result);
  } catch (error) {
    return handleApiError(error, "DELETE /api/workspace/members/[userId]");
  }
}
