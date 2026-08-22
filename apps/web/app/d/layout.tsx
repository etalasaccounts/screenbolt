import { Toaster } from "sonner";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { RecordingProvider } from "@/components/record/recording-provider";
import { QueryProvider } from "@/components/shell/query-provider";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspaceList = await WorkspaceService.getWorkspacesForUser(user.id);
  const workspaces = workspaceList.map((ws) => ({ id: ws.id, name: ws.name }));
  const activeWorkspace = workspaceList.find((ws) => ws.id === user.activeWorkspaceId) ?? workspaceList[0] ?? null;

  return (
    <QueryProvider>
      <RecordingProvider>
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
      </RecordingProvider>
    </QueryProvider>
  );
}
