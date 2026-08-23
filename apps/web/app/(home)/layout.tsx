import { Toaster } from "sonner";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { Sidebar } from "@/components/shell/sidebar";
import { QueryProvider } from "@/components/shell/query-provider";

export const dynamic = "force-dynamic";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const workspaceList = user ? await WorkspaceService.getWorkspacesForUser(user.id) : [];
  const workspaces = workspaceList.map((ws) => ({ id: ws.id, name: ws.name }));
  const activeWorkspace = user
    ? workspaceList.find((ws) => ws.id === user.activeWorkspaceId) ?? workspaceList[0] ?? null
    : null;

  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-[#f5f5f2] text-[#090b0c] md:flex-row flex-col">
        <Sidebar
          user={
            user
              ? {
                  id: user.id,
                  name: user.name ?? null,
                  email: user.email ?? null,
                  image: user.image ?? user.avatarUrl ?? null,
                }
              : null
          }
          workspaces={workspaces}
          activeWorkspaceId={user?.activeWorkspaceId ?? null}
          activeWorkspaceMemberCount={activeWorkspace?.memberCount ?? 1}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 md:px-8">{children}</main>
        <Toaster position="bottom-center" />
      </div>
    </QueryProvider>
  );
}
