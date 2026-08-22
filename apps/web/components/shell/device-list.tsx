"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

export interface DeviceRow {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

function relative(iso: string | null): string {
  if (!iso) return "Never used";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Used just now";
  if (mins < 60) return `Used ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Used ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Used ${days}d ago`;
}

export function DeviceList({ devices }: { devices: DeviceRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function revoke(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/extension/device/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || "Revoke failed");
      toast.success("Device disconnected");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke device");
    } finally {
      setBusyId(null);
    }
  }

  if (devices.length === 0) {
    return (
      <p className="text-[0.875rem] text-[#090b0c]/50">
        No connected devices. Pair the Screenbolt extension to see it here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-black/[.06]">
      {devices.map((d) => (
        <li key={d.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/[.06]">
              <Icon icon="solar:videocamera-linear" style={{ fontSize: "1.1rem" }} />
            </span>
            <div>
              <p className="text-[0.9375rem] font-medium">
                {d.label || "Device"}
                {d.revoked && <span className="ml-2 text-[0.75rem] text-[#090b0c]/40">(revoked)</span>}
              </p>
              <p className="text-[0.8125rem] text-[#090b0c]/45">
                Added {new Date(d.createdAt).toLocaleDateString()} · {relative(d.lastUsedAt)}
              </p>
            </div>
          </div>
          {!d.revoked && (
            <button
              type="button"
              onClick={() => revoke(d.id)}
              disabled={busyId === d.id}
              className="flex h-9 items-center rounded-full border border-black/[.12] px-3.5 text-[0.8125rem] text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {busyId === d.id ? "Revoking…" : "Revoke"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
