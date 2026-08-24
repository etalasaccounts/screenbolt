import { NextRequest } from "next/server";
import { z } from "zod";

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
    const current = workspaces.find((ws) => ws.id === user.activeWorkspaceId) ?? workspaces[0] ?? null;

    return ok({ workspaces, workspace: current });
  } catch (error) {
    return handleApiError(error, "GET /api/workspace");
  }
}

const createSchema = z.object({ name: z.string().min(1).max(100) });
const renameSchema = z.object({ name: z.string().min(1).max(100) });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Name is required", "VALIDATION_ERROR", 400);
    }

    const workspace = await WorkspaceService.createWorkspace(user.id, parsed.data.name);
    return ok({ workspace }, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/workspace");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Unauthorized", "UNAUTHORIZED", 401);
    }

    if (!user.activeWorkspaceId) {
      return fail("No active workspace", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const parsed = renameSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Name is required", "VALIDATION_ERROR", 400);
    }

    const workspace = await WorkspaceService.renameWorkspace(user.id, user.activeWorkspaceId, parsed.data.name);
    return ok({ workspace });
  } catch (error) {
    return handleApiError(error, "PATCH /api/workspace");
  }
}
