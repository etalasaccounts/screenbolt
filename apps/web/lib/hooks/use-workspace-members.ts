import { useQuery } from "@tanstack/react-query";

export interface WorkspaceMember {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "owner" | "member";
  joinedAt: string;
}

interface WorkspaceMembersResponse {
  members: WorkspaceMember[];
  viewerRole: "owner" | "member";
}

async function fetchWorkspaceMembers(): Promise<WorkspaceMembersResponse> {
  const res = await fetch("/api/workspace/members");
  if (!res.ok) throw new Error("Failed to load workspace members");
  const body = await res.json();
  return body.data;
}

const queryConfig = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: ["workspace-members"],
    queryFn: fetchWorkspaceMembers,
    ...queryConfig,
  });
}
