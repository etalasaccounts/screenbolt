"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { getUserInitials } from "@/lib/client/format";
import { useRecording } from "@/components/record/recording-provider";

interface ShellUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface ShellWorkspace {
  id: string;
  name: string;
}

export function Sidebar({
  user,
  workspaces,
  activeWorkspaceId,
  activeWorkspaceMemberCount,
}: {
  user: ShellUser | null;
  workspaces: ShellWorkspace[];
  activeWorkspaceId: string | null;
  activeWorkspaceMemberCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { openPanel } = useRecording();
  const [wsOpen, setWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);

  const activeWorkspace =
    workspaces.find((ws) => ws.id === activeWorkspaceId) ?? workspaces[0] ?? null;

  async function switchWorkspace(id: string) {
    if (id === activeWorkspaceId) return setWsOpen(false);
    setBusy(true);
    try {
      await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: id }),
      });
    } finally {
      setBusy(false);
      setWsOpen(false);
      router.push("/home");
      router.refresh();
    }
  }

  async function createWorkspace() {
    const name = newWsName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const body = await res.json();
        await fetch("/api/workspace/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: body.data.workspace.id }),
        });
      }
    } finally {
      setBusy(false);
      setNewWsName("");
      setWsOpen(false);
      router.push("/home");
      router.refresh();
    }
  }

  async function inviteTeammates() {
    if (inviteBusy) return;
    setInviteBusy(true);
    try {
      const res = await fetch("/api/workspace/invite", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body?.error?.message ?? "Could not create invite link");
      }
      const url = `${window.location.origin}/invite/${body.data.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invite link");
    } finally {
      setInviteBusy(false);
    }
  }

  const navItem = (opts: { href?: string; label: string; onClick?: () => void }) => {
    const active = opts.href
      ? pathname === opts.href ||
        (opts.href !== "/home" &&
          pathname.startsWith(opts.href) &&
          (pathname.length === opts.href.length || pathname[opts.href.length] !== "/"))
      : false;
    const className = `block py-2 px-3.5 text-[0.9375rem] rounded-lg transition-colors ${
      active
        ? "bg-black/[.08] font-medium text-[#090b0c]"
        : "text-[#090b0c]/55 hover:bg-black/[.04] hover:text-[#090b0c]"
    }`;
    if (opts.href) {
      return (
        // next/link, not a plain <a> -- a plain anchor triggers a full
        // browser navigation (full reload), which would tear down the
        // RecordingProvider mounted in this layout and kill any
        // in-progress recording's floating controls just from navigating.
        <Link key={opts.label} href={opts.href} className={className} onClick={() => setMobileOpen(false)}>
          {opts.label}
        </Link>
      );
    }
    return (
      <button
        key={opts.label}
        type="button"
        onClick={() => {
          setMobileOpen(false);
          opts.onClick?.();
        }}
        className={`w-full text-left ${className}`}
      >
        {opts.label}
      </button>
    );
  };

  const sidebarBody = (
    <div className="flex h-full flex-col px-5 py-6">
      <Link href={user ? "/home" : "/"} className="flex items-center">
        <Image src="/logo.svg" alt="Screenbolt" width={100} height={21} className="h-[21px] w-auto brightness-0" priority />
      </Link>

      {user && (
        <>
          <button
            type="button"
            onClick={openPanel}
            className="mt-6 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 text-[0.875rem] font-medium text-white shadow-[0_10px_24px_rgba(37,99,235,.28)] transition-opacity hover:opacity-90"
          >
            <Icon icon="solar:record-circle-fill" style={{ fontSize: "0.9375rem" }} />
            Record
          </button>

          <nav className="mt-8 flex flex-col gap-0.5">
            {navItem({ href: "/d", label: "Videos" })}
            {navItem({ href: "/d/settings", label: "Settings" })}
          </nav>
        </>
      )}

      <div className="mt-auto space-y-4">
        {user && (
          <div className="relative rounded-2xl border border-black/[.08] bg-white/60 p-3">
            <button
              type="button"
              onClick={() => setWsOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-[0.8125rem] font-medium text-[#090b0c]">Workspace</span>
              <Icon
                icon="solar:alt-arrow-down-linear"
                className={`text-[#090b0c]/50 transition-transform ${wsOpen ? "rotate-180" : ""}`}
                style={{ fontSize: "0.9375rem" }}
              />
            </button>

            <div className="mt-2 flex items-center gap-2 text-[0.75rem] text-[#090b0c]/55">
              <span className="max-w-[110px] truncate rounded-md bg-black/[.06] px-2 py-0.5 font-medium text-[#090b0c]">
                {activeWorkspace?.name ?? "Workspace"}
              </span>
              <span className="text-[#090b0c]/25">|</span>
              <span>
                {activeWorkspaceMemberCount} member{activeWorkspaceMemberCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-3 border-t border-black/[.06] pt-3">
              <button
                type="button"
                onClick={inviteTeammates}
                disabled={inviteBusy}
                className="flex w-full items-center gap-1.5 text-left text-[0.8125rem] text-[#090b0c]/70 transition-colors hover:text-[#090b0c] disabled:opacity-50"
              >
                <Icon icon="solar:user-plus-linear" style={{ fontSize: "0.9375rem" }} />
                Invite teammates
              </button>
            </div>

            {wsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setWsOpen(false)} />
                <div className="absolute left-0 z-50 mt-2 w-64 rounded-2xl border border-black/[.08] bg-white/95 p-2 shadow-[0_16px_48px_rgba(0,0,0,.12)] backdrop-blur-xl">
                  <p className="px-2 pb-1 pt-1 text-[0.6875rem] uppercase tracking-[0.12rem] text-[#090b0c]/40">
                    Workspaces
                  </p>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => switchWorkspace(ws.id)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[0.875rem] transition-colors hover:bg-black/[.04]"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/[.06] text-[0.6875rem] font-medium">
                        {getUserInitials(ws.name)}
                      </span>
                      <span className="flex-1 truncate">{ws.name}</span>
                      {ws.id === activeWorkspaceId && (
                        <Icon icon="solar:check-circle-linear" className="text-[#090b0c]/50" />
                      )}
                    </button>
                  ))}
                  <div className="mt-1 border-t border-black/[.06] pt-2">
                    <input
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
                      placeholder="New workspace name"
                      className="h-9 w-full rounded-xl border border-black/[.12] px-3 text-[0.875rem] outline-none focus:border-black/30"
                    />
                    <button
                      type="button"
                      onClick={createWorkspace}
                      disabled={!newWsName.trim() || busy}
                      className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#090b0c] text-[0.8125rem] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                    >
                      <Icon icon="solar:plus-circle-linear" />
                      Create workspace
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {user ? (
          <div className="flex items-center gap-2.5 border-t border-black/[.06] pt-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#090b0c] text-[0.75rem] font-medium text-white">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                getUserInitials(user.name ?? user.email ?? "?")
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-medium text-[#090b0c]">{user.name ?? "Account"}</p>
              <p className="truncate text-[0.75rem] text-[#090b0c]/50">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Log out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#090b0c]/40 transition-colors hover:bg-black/[.05] hover:text-[#090b0c]"
            >
              <Icon icon="solar:logout-2-linear" style={{ fontSize: "0.9375rem" }} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border-t border-black/[.06] pt-4">
            <Link
              href="/login"
              className="text-[0.875rem] text-[#090b0c]/70 transition-colors hover:text-[#090b0c]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex h-9 items-center justify-center rounded-full bg-[#090b0c] px-4 text-[0.875rem] text-white transition-opacity hover:opacity-85"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: persistent column */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-black/[.06] md:block">
        {sidebarBody}
      </aside>

      {/* Mobile: slim top bar + full-screen overlay */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-black/[.06] bg-[#f5f5f2]/85 px-4 backdrop-blur-md md:hidden">
        <Link href={user ? "/home" : "/"} className="flex items-center">
          <Image src="/logo.svg" alt="Screenbolt" width={92} height={20} className="h-[20px] w-auto brightness-0" priority />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#090b0c]/70 transition-colors hover:bg-black/[.05]"
        >
          <Icon icon="solar:hamburger-menu-linear" style={{ fontSize: "1.25rem" }} />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-[#f5f5f2] md:hidden">
          <div className="flex h-14 items-center justify-end px-4">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#090b0c]/70 transition-colors hover:bg-black/[.05]"
            >
              <Icon icon="solar:close-circle-linear" style={{ fontSize: "1.25rem" }} />
            </button>
          </div>
          <div className="h-[calc(100%-3.5rem)]">{sidebarBody}</div>
        </div>
      )}
    </>
  );
}
