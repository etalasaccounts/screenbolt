"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[0.8125rem] font-medium text-[#090b0c]/60">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 w-full max-w-sm rounded-xl border border-black/[.12] bg-white px-3.5 text-[0.9375rem] outline-none focus:border-black/30"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[0.8125rem] font-medium text-[#090b0c]/60">Email</label>
        <input
          value={email}
          disabled
          className="h-11 w-full max-w-sm rounded-xl border border-black/[.08] bg-black/[.03] px-3.5 text-[0.9375rem] text-[#090b0c]/50"
        />
      </div>
      <button
        type="submit"
        disabled={saving || !name.trim() || name.trim() === initialName}
        className="flex h-10 items-center rounded-full bg-[#090b0c] px-5 text-[0.875rem] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
