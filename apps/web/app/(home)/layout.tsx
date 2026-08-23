import { Toaster } from "sonner";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { Sidebar } from "@/components/shell/sidebar";
import { PublicHeader } from "@/components/shell/public-header";
import { QueryProvider } from "@/components/shell/query-provider";

export const dynamic = "force-dynamic";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Within this group only /watch/[id] is reachable while logged out (see the
  // public allowlist in lib/auth/config.ts), so a null user here means exactly
  // one thing: an anonymous visitor who followed a share link. Give them a slim
  // public header instead of the app sidebar, whose nav is entirely hidden for
  // them anyway -- an empty 240px column is a poor first impression, and this is
  // the moment they are most likely to sign up.
  if (!user) {
    return (
      <QueryProvider>
        <div className="flex min-h-screen flex-col bg-[#f5f5f2] text-[#090b0c]">
          <PublicHeader />
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 md:px-8">{children}</main>
          <Toaster position="bottom-center" />
        </div>
      </QueryProvider>
    );
  }

  const workspaceList = await WorkspaceService.getWorkspacesForUser(user.id);
  const workspaces = workspaceList.map((ws) => ({ id: ws.id, name: ws.name }));
  const activeWorkspace =
    workspaceList.find((ws) => ws.id === user.activeWorkspaceId) ?? workspaceList[0] ?? null;

  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-[#f5f5f2] text-[#090b0c] md:flex-row flex-col">
        <Sidebar
          user={{
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            image: user.image ?? user.avatarUrl ?? null,
          }}
          workspaces={workspaces}
          activeWorkspaceId={user.activeWorkspaceId ?? null}
          activeWorkspaceMemberCount={activeWorkspace?.memberCount ?? 1}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 md:px-8">{children}</main>
        <Toaster position="bottom-center" />
      </div>
    </QueryProvider>
  );
}
