"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { useCurrentUser, useWorkspaces } from "@/lib/hooks/use-account-data";
import { Sidebar } from "@/components/shell/sidebar";
import { QueryProvider } from "@/components/shell/query-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </QueryProvider>
  );
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser();
  const { data: workspaces = [] } = useWorkspaces();

  useEffect(() => {
    if (userError) {
      router.replace("/login");
    }
  }, [userError, router]);

  if (userLoading || !user) {
    return null;
  }

  const activeWorkspace = workspaces.find((ws) => ws.id === user.activeWorkspaceId) ?? workspaces[0] ?? null;

  return (
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
  );
}
