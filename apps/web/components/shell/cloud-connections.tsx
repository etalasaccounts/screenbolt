"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

export function CloudConnections({
  drive,
  dropbox,
}: {
  drive: { configured: boolean; connected: boolean };
  dropbox: { configured: boolean; connected: boolean };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function disconnect(provider: "drive" | "dropbox") {
    setBusy(provider);
    try {
      const res = await fetch(`/api/auth/${provider === "drive" ? "google" : "dropbox"}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success("Disconnected");
      router.refresh();
    } catch {
      toast.error("Could not disconnect");
    } finally {
      setBusy(null);
    }
  }

  const row = (
    name: string,
    icon: string,
    configured: boolean,
    connected: boolean,
    provider: "drive" | "dropbox",
  ) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/[.06]">
          <Icon icon={icon} style={{ fontSize: "1.25rem" }} />
        </span>
        <div>
          <p className="text-[0.9375rem] font-medium">{name}</p>
          <p className="text-[0.8125rem] text-[#090b0c]/45">
            {!configured
              ? "Not configured — set credentials in .env.local"
              : connected
                ? "Connected"
                : "Not connected"}
          </p>
        </div>
      </div>

      {configured && connected ? (
        <button
          type="button"
          disabled={busy === provider}
          onClick={() => disconnect(provider)}
          className="flex h-9 items-center rounded-full border border-black/[.12] px-4 text-[0.8125rem] transition-colors hover:bg-black/[.04] disabled:opacity-50"
        >
          Disconnect
        </button>
      ) : (
        <a
          href={`/api/auth/${provider === "drive" ? "google" : "dropbox"}`}
          className={
            configured
              ? "flex h-9 items-center rounded-full bg-[#090b0c] px-4 text-[0.8125rem] text-white transition-opacity hover:opacity-85"
              : "flex h-9 items-center rounded-full border border-black/[.12] px-4 text-[0.8125rem] text-[#090b0c]/40"
          }
          aria-disabled={!configured}
          onClick={(e) => {
            if (!configured) e.preventDefault();
          }}
        >
          Connect
        </a>
      )}
    </div>
  );

  return (
    <section className="rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
      <h2 className="mb-2 text-lg font-medium tracking-tight">Cloud storage</h2>
      <p className="mb-3 text-[0.875rem] text-[#090b0c]/50">
        Save your recordings straight to Google Drive or Dropbox.
      </p>
      <ul className="divide-y divide-black/[.06]">
        {row("Google Drive", "logos:google-drive", drive.configured, drive.connected, "drive")}
        {row("Dropbox", "logos:dropbox", dropbox.configured, dropbox.connected, "dropbox")}
      </ul>
    </section>
  );
}
