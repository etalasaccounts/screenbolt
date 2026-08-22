/**
 * Workspace invite-link database operations.
 *
 * Invite links are multi-use and expiring (Discord/Slack-style): anyone
 * with the link can join the workspace while it is "active" and unexpired.
 */

import { randomBytes } from "crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceInvites } from "@/lib/db/schema";
import type { WorkspaceInvite } from "@/lib/db/schema";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function findActiveInvite(workspaceId: string): Promise<WorkspaceInvite | null> {
  const [invite] = await db
    .select()
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        eq(workspaceInvites.status, "active"),
        gt(workspaceInvites.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(workspaceInvites.createdAt))
    .limit(1);
  return invite ?? null;
}

export async function createInvite(workspaceId: string, invitedByUserId: string): Promise<WorkspaceInvite> {
  const [invite] = await db
    .insert(workspaceInvites)
    .values({
      token: generateInviteToken(),
      workspaceId,
      invitedByUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })
    .returning();
  return invite;
}

export async function getInviteByToken(token: string): Promise<WorkspaceInvite | null> {
  const [invite] = await db
    .select()
    .from(workspaceInvites)
    .where(eq(workspaceInvites.token, token))
    .limit(1);
  return invite ?? null;
}
