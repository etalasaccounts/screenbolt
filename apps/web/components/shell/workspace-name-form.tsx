"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { ApiClientError, apiPatch } from "@/lib/client/api-fetch";

export function WorkspaceNameForm({
  initialName,
  canEdit = true,
}: {
  initialName: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return;
    setSaving(true);
    try {
      await apiPatch("/api/workspace", { name: trimmed });
      toast.success("Workspace renamed");
      // Invalidate workspaces query to update sidebar
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not rename workspace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[0.8125rem] font-medium text-[#090b0c]/60">Workspace name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          className={
            !canEdit
              ? "h-11 w-full max-w-sm rounded-xl border border-black/[.08] bg-black/[.03] px-3.5 text-[0.9375rem] text-[#090b0c]/50"
              : "h-11 w-full max-w-sm rounded-xl border border-black/[.12] bg-white px-3.5 text-[0.9375rem] outline-none focus:border-black/30"
          }
        />
        {!canEdit && (
          <p className="mt-2 text-[0.8125rem] text-[#090b0c]/50">Only workspace owners can rename the workspace</p>
        )}
      </div>
      {canEdit && (
        <button
          type="submit"
          disabled={saving || !name.trim() || name.trim() === initialName}
          className="flex h-10 items-center rounded-full bg-[#090b0c] px-5 text-[0.875rem] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      )}
    </form>
  );
}
