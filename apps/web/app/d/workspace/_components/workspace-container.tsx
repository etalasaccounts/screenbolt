"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { useCurrentUser, useWorkspaces } from "@/lib/hooks/use-account-data";
import { useWorkspaceMembers } from "@/lib/hooks/use-workspace-members";
import { WorkspaceSkeleton } from "./workspace-skeleton";
import { WorkspaceView } from "./workspace-view";

export function WorkspaceContainer() {
  const router = useRouter();
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser();
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaces();
  const { data: membersData, isLoading: membersLoading, error: membersError } = useWorkspaceMembers();

  useEffect(() => {
    if (userError) {
      router.push("/login");
    }
  }, [userError, router]);

  // Loading state - show skeleton
  if (userLoading || !user) {
    return <WorkspaceSkeleton />;
  }

  // Error state
  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Icon icon="solar:danger-linear" className="mb-4 text-red-500" style={{ fontSize: "2rem" }} />
        <p className="text-[#090b0c]/50">Failed to load workspace</p>
      </div>
    );
  }

  // Derive active workspace
  const activeWorkspace =
    workspaces.find((ws) => ws.id === user.activeWorkspaceId) ?? workspaces[0] ?? null;

  // Show skeleton while workspaces are loading
  if (workspacesLoading) {
    return <WorkspaceSkeleton />;
  }

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Icon icon="solar:danger-linear" className="mb-4 text-red-500" style={{ fontSize: "2rem" }} />
        <p className="text-[#090b0c]/50">No workspace found</p>
      </div>
    );
  }

  // Members loading state
  if (membersLoading) {
    return <WorkspaceSkeleton />;
  }

  // Members error state
  if (membersError || !membersData) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Icon icon="solar:danger-linear" className="mb-4 text-red-500" style={{ fontSize: "2rem" }} />
        <p className="text-[#090b0c]/50">Failed to load team members</p>
      </div>
    );
  }

  // Success state - render dumb view component
  return (
    <WorkspaceView
      user={user}
      workspace={activeWorkspace}
      members={membersData.members}
      viewerRole={membersData.viewerRole}
    />
  );
}
