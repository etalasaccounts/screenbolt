import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { ApiError } from "@/lib/shared/errors";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  let errorMessage: string | null = null;
  try {
    await WorkspaceService.acceptInvite(token, user.id);
  } catch (error) {
    errorMessage = error instanceof ApiError ? error.message : "Something went wrong.";
  }

  if (!errorMessage) {
    redirect("/d");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f5f2] px-6 text-center text-[#090b0c]">
      <h1 className="text-[1.5rem] font-normal">Invite link not valid</h1>
      <p className="text-[0.9375rem] text-[#090b0c]/60">{errorMessage}</p>
      <Link href="/d" className="text-[0.875rem] text-[#090b0c] underline">
        Go to your workspace
      </Link>
    </div>
  );
}
