import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { DeviceService } from "@/lib/services/device.service";
import { WorkspaceService } from "@/lib/services/workspace.service";
import { ConnectClient } from "@/components/shell/connect-client";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const { code } = await searchParams;
    const loginUrl = code ? `/login?callbackUrl=${encodeURIComponent(`/connect?code=${code}`)}` : "/login";
    redirect(loginUrl);
  }

  const { code } = await searchParams;

  // No code: just show the connected-devices entry point info.
  if (!code) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-sm flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-normal tracking-tight">Connect a device</h1>
        <p className="mt-2 text-[0.9375rem] text-[#090b0c]/50">
          This page approves extension pairing requests. Open it from the Screenbolt extension.
        </p>
        <a
          href="/account"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-[#090b0c] px-6 text-[0.9375rem] text-white transition-opacity hover:opacity-85"
        >
          View connected devices
        </a>
      </div>
    );
  }

  const pairing = await DeviceService.getPairing(code);
  const workspace = user.activeWorkspaceId ? await WorkspaceService.getWorkspace(user.activeWorkspaceId) : null;

  // Already handled (approved or expired) — surface a neutral message.
  if (!pairing || pairing.status === "expired") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-sm flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-normal tracking-tight">
          {pairing?.status === "expired" ? "This request expired" : "Request not found"}
        </h1>
        <p className="mt-2 text-[0.9375rem] text-[#090b0c]/50">
          {pairing?.status === "expired"
            ? "The pairing code expired (10 minute window). Please try again from the extension."
            : "That pairing code doesn't match any request."}
        </p>
      </div>
    );
  }

  if (pairing.status === "approved") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-sm flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-normal tracking-tight">Already approved</h1>
        <p className="mt-2 text-[0.9375rem] text-[#090b0c]/50">
          This device was already approved. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center">
      <ConnectClient code={code} />
      <p className="mt-6 text-[0.8125rem] text-[#090b0c]/40">
        Connecting to workspace: <span className="font-medium text-[#090b0c]/70">{workspace?.name ?? "Personal"}</span>
      </p>
    </div>
  );
}
