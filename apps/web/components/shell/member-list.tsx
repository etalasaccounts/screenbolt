"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { getUserInitials } from "@/lib/client/format";
import { ApiClientError, apiPost, apiFetch } from "@/lib/client/api-fetch";
import type { WorkspaceMember } from "@/lib/hooks/use-workspace-members";

interface MemberListProps {
  members: WorkspaceMember[];
  viewerRole: "owner" | "member";
  viewerUserId: string;
}

export function MemberList({ members, viewerRole, viewerUserId }: MemberListProps) {
  const queryClient = useQueryClient();
  const [inviteBusy, setInviteBusy] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  async function inviteTeammates() {
    if (inviteBusy) return;
    setInviteBusy(true);
    try {
      const invite = await apiPost<{ token: string }>("/api/workspace/invite", {});
      const url = `${window.location.origin}/invite/${invite.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not create invite link");
    } finally {
      setInviteBusy(false);
    }
  }

  async function removeMember(memberId: string, memberName: string | null) {
    if (!window.confirm(`Remove ${memberName || "this member"} from the workspace?`)) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      await apiFetch(`/api/workspace/members/${memberId}`, { method: "DELETE" });
      toast.success("Member removed");
      // Invalidate both queries
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not remove member");
    } finally {
      setRemovingMemberId(null);
    }
  }

  const isOwner = (member: WorkspaceMember) => member.role === "owner";
  const isViewer = (member: WorkspaceMember) => member.userId === viewerUserId;
  const canRemove = (member: WorkspaceMember) =>
    viewerRole === "owner" && !isOwner(member) && !isViewer(member);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={inviteTeammates}
        disabled={inviteBusy}
        className="flex items-center gap-1.5 text-[0.875rem] text-[#090b0c]/70 transition-colors hover:text-[#090b0c] disabled:opacity-50"
      >
        <Icon icon="solar:user-plus-linear" style={{ fontSize: "1rem" }} />
        Invite teammates
      </button>

      <div className="space-y-2 border-t border-black/[.06] pt-4">
        {members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center justify-between rounded-lg border border-black/[.06] p-3 transition-colors hover:bg-black/[.02]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#090b0c] text-[0.75rem] font-medium text-white">
                {member.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  getUserInitials(member.name ?? member.email ?? "?")
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-medium text-[#090b0c]">
                  {member.name ?? "Member"}
                </p>
                <p className="truncate text-[0.8125rem] text-[#090b0c]/50">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 ml-2">
              {isOwner(member) && (
                <span className="rounded-full bg-black/[.06] px-2.5 py-1 text-[0.75rem] font-medium text-[#090b0c]/70">
                  Owner
                </span>
              )}

              {canRemove(member) && (
                <button
                  type="button"
                  onClick={() => removeMember(member.userId, member.name)}
                  disabled={removingMemberId === member.userId}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#090b0c]/40 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                  title="Remove member"
                >
                  {removingMemberId === member.userId ? (
                    <Icon icon="solar:refresh-linear" className="animate-spin" style={{ fontSize: "1rem" }} />
                  ) : (
                    <Icon icon="solar:trash-bin-2-linear" style={{ fontSize: "1rem" }} />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
