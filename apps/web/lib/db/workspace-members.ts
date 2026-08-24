/**
 * Workspace membership database operations.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceMembers, users } from "@/lib/db/schema";

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: "owner" | "member",
): Promise<void> {
  await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId, role })
    .onConflictDoNothing();
}

export async function isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return !!row;
}

export async function getWorkspaceMemberRole(workspaceId: string, userId: string): Promise<"owner" | "member" | null> {
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

export async function listWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      userId: workspaceMembers.userId,
      name: users.name,
      email: users.email,
      image: users.image,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
}
