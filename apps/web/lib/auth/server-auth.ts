import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/db/users";
import { ensureActiveWorkspace } from "@/lib/db/workspaces";
import { findValidDeviceToken, touchDeviceToken } from "@/lib/db/devices";

export interface ServerUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  avatarUrl: string | null;
  activeWorkspaceId: string | null;
  createdAt: Date | null;
}

/** Load a user (with active workspace) by their id, provisioning if needed. */
async function loadUserById(id: string): Promise<ServerUser | null> {
  const user = await getUserById(id);
  if (!user) return null;

  // Provision a workspace if missing.
  if (!user.activeWorkspaceId) {
    const workspaceId = await ensureActiveWorkspace(id);
    if (workspaceId) {
      user.activeWorkspaceId = workspaceId;
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    avatarUrl: user.avatarUrl,
    activeWorkspaceId: user.activeWorkspaceId,
    createdAt: user.createdAt,
  };
}

/**
 * Resolve the current user from the NextAuth session. Lazily provisions a
 * "Personal" workspace if the user somehow has none.
 */
export async function getCurrentUser(): Promise<ServerUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    return loadUserById(session.user.id);
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

/**
 * Resolve the current user from either a NextAuth session cookie OR a
 * bearer device token (the extension's auth path). Cookie wins if both are
 * present; otherwise a `sbt_...` bearer token is hashed and looked up in
 * deviceTokens. Returns the same ServerUser shape as getCurrentUser(), so
 * upload routes can swap this in without changing their logic.
 */
export async function getCurrentUserOrToken(
  request: Request,
): Promise<ServerUser | null> {
  try {
    const sessionUser = await getCurrentUser();
    if (sessionUser) return sessionUser;

    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) return null;

    const token = header.slice("Bearer ".length).trim();
    if (!token) return null;

    const device = await findValidDeviceToken(token);
    if (!device) return null;

    // Scope: use the workspace bound at pairing time, not the user's current
    // active workspace — this keeps extension uploads deterministic even if
    // the user switches workspaces in the web app.
    const user = await loadUserById(device.userId);
    if (!user) return null;

    user.activeWorkspaceId = device.workspaceId;
    await touchDeviceToken(device.id);
    return user;
  } catch (error) {
    console.error("getCurrentUserOrToken error:", error);
    return null;
  }
}

export async function requireUser(): Promise<ServerUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
