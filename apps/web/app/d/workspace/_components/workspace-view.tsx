import { WorkspaceNameForm } from "@/components/shell/workspace-name-form";
import { MemberList } from "@/components/shell/member-list";
import type { WorkspaceMember } from "@/lib/hooks/use-workspace-members";

interface Workspace {
  id: string;
  name: string;
}

interface User {
  id: string;
}

interface WorkspaceViewProps {
  user: User;
  workspace: Workspace;
  members: WorkspaceMember[];
  viewerRole: "owner" | "member";
}

export function WorkspaceView({
  user,
  workspace,
  members,
  viewerRole,
}: WorkspaceViewProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-9 border-b border-black/[.07] pb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-px w-4 bg-[#090b0c]/40" />
          <p className="text-[0.6875rem] font-normal uppercase tracking-[0.14rem] text-[#090b0c]/45">
            Workspace
          </p>
        </div>
        <h1 className="text-[2.25rem] font-normal leading-[0.98] tracking-tight text-[#090b0c] md:text-[2.75rem]">
          <span className="font-serif-italic">{workspace.name}</span>
        </h1>
      </div>

      <section className="mb-6 rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <h2 className="mb-4 text-lg font-medium tracking-tight">Workspace name</h2>
        <WorkspaceNameForm initialName={workspace.name} canEdit={viewerRole === "owner"} />
      </section>

      <section className="rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <h2 className="mb-4 text-lg font-medium tracking-tight">Team</h2>
        <MemberList
          members={members}
          viewerRole={viewerRole}
          viewerUserId={user.id}
        />
      </section>
    </div>
  );
}
