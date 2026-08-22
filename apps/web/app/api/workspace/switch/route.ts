import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const switchSchema = z.object({ workspaceId: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await request.json();
    const parsed = switchSchema.safeParse(body);
    if (!parsed.success) {
      return fail("workspaceId is required", "VALIDATION_ERROR", 400);
    }

    const result = await WorkspaceService.switchWorkspace(user.id, parsed.data.workspaceId);
    return ok({ workspaceId: result.id });
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/switch");
  }
}
