/**
 * Workspace membership database operations.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";

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
