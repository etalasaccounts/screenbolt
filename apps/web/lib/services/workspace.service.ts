import { getWorkspacesForUser, createWorkspace, setActiveWorkspace, getWorkspace } from "@/lib/db/workspaces";
import { isWorkspaceMember, addWorkspaceMember } from "@/lib/db/workspace-members";
import { findActiveInvite, createInvite, getInviteByToken } from "@/lib/db/workspace-invites";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/shared/errors";

export interface WorkspaceData {
  id: string;
  name: string;
  videos: { id: string }[];
  videoCount?: number;
  memberCount?: number;
}

export interface WorkspaceInviteData {
  token: string;
  expiresAt: string;
}

export class WorkspaceService {
  static async getWorkspacesForUser(userId: string): Promise<WorkspaceData[]> {
    const workspaces = await getWorkspacesForUser(userId);

    return workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      videos: ws.videos,
      videoCount: ws.videos.length,
      memberCount: ws.members.length,
    }));
  }

  static async createWorkspace(userId: string, name: string): Promise<WorkspaceData> {
    if (!name || !name.trim()) {
      throw new ValidationError("Workspace name is required");
    }

    const workspace = await createWorkspace(userId, name);

    return {
      id: workspace.id,
      name: workspace.name,
      videos: [],
      videoCount: 0,
      memberCount: 1,
    };
  }

  static async switchWorkspace(userId: string, workspaceId: string): Promise<{ id: string }> {
    if (!workspaceId) {
      throw new ValidationError("Workspace ID is required");
    }

    const workspace = await setActiveWorkspace(userId, workspaceId);
    if (!workspace) {
      throw new NotFoundError("Workspace not found or does not belong to you");
    }

    return { id: workspace.id };
  }

  static async getWorkspace(workspaceId: string): Promise<WorkspaceData | null> {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) return null;

    return {
      id: workspace.id,
      name: workspace.name,
      videos: workspace.videos,
      videoCount: workspace.videos.length,
      memberCount: workspace.members.length,
    };
  }

  static async createInvite(userId: string, workspaceId: string): Promise<WorkspaceInviteData> {
    const member = await isWorkspaceMember(workspaceId, userId);
    if (!member) {
      throw new ForbiddenError("You are not a member of this workspace");
    }

    const existing = await findActiveInvite(workspaceId);
    const invite = existing ?? (await createInvite(workspaceId, userId));

    return { token: invite.token, expiresAt: invite.expiresAt.toISOString() };
  }

  static async acceptInvite(token: string, userId: string): Promise<{ workspaceId: string }> {
    const invite = await getInviteByToken(token);
    const isValid = !!invite && invite.status === "active" && invite.expiresAt.getTime() > Date.now();
    if (!invite || !isValid) {
      throw new ValidationError("This invite link is invalid or has expired");
    }

    const alreadyMember = await isWorkspaceMember(invite.workspaceId, userId);
    if (!alreadyMember) {
      await addWorkspaceMember(invite.workspaceId, userId, "member");
    }

    await setActiveWorkspace(userId, invite.workspaceId);

    return { workspaceId: invite.workspaceId };
  }
}
