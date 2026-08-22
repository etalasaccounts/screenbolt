import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces, users, videos, workspaceMembers } from "@/lib/db/schema";
import { isWorkspaceMember } from "@/lib/db/workspace-members";

/**
 * Ensure a user has an active workspace, provisioning one if needed.
 * If the user has an activeWorkspaceId, returns it unchanged.
 * If the user has no activeWorkspaceId, creates a "Personal" workspace,
 * adds the user as its owner member, updates the user's activeWorkspaceId,
 * and returns the new id.
 *
 * @param userId - The user ID
 * @returns The active workspace ID (existing or newly created)
 */
export async function ensureActiveWorkspace(userId: string): Promise<string | null> {
  // First, check if user already has an active workspace
  const [user] = await db
    .select({ activeWorkspaceId: users.activeWorkspaceId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;
  if (user.activeWorkspaceId) return user.activeWorkspaceId;

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name: "Personal", userId })
      .returning();

    if (!workspace) return null;

    await tx.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, role: "owner" });
    await tx.update(users).set({ activeWorkspaceId: workspace.id }).where(eq(users.id, userId));

    return workspace.id;
  });
}

export async function getWorkspacesForUser(userId: string) {
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));

  const workspaceIds = memberships.map((m) => m.workspaceId);
  if (workspaceIds.length === 0) return [];

  return db.query.workspaces.findMany({
    where: inArray(workspaces.id, workspaceIds),
    orderBy: desc(workspaces.createdAt),
    with: {
      videos: { columns: { id: true } },
      members: { columns: { userId: true } },
    },
  });
}

export async function getWorkspace(id: string) {
  return (
    (await db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      with: {
        videos: { columns: { id: true } },
        members: { columns: { userId: true } },
      },
    })) ?? null
  );
}

export async function createWorkspace(userId: string, name: string) {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name: name.trim() || "Untitled workspace", userId })
      .returning();

    await tx.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, role: "owner" });

    return workspace;
  });
}

export async function setActiveWorkspace(userId: string, workspaceId: string) {
  const isMember = await isWorkspaceMember(workspaceId, userId);
  if (!isMember) return null;

  await db.update(users).set({ activeWorkspaceId: workspaceId }).where(eq(users.id, userId));
  return { id: workspaceId };
}

export async function countVideos(workspaceId: string) {
  const rows = await db.select({ id: videos.id }).from(videos).where(eq(videos.workspaceId, workspaceId));
  return rows.length;
}
