"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { useCurrentUser, useWorkspaces, useDeviceTokens, useCloudConnections } from "@/lib/hooks/use-account-data";
import { SettingsSkeleton } from "./settings-skeleton";
import { SettingsView } from "./settings-view";

export function SettingsContainer() {
  const router = useRouter();
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser();
  const { data: workspaces = [] } = useWorkspaces();
  const { data: deviceTokens = [] } = useDeviceTokens();
  const { data: cloudConfig } = useCloudConnections();

  useEffect(() => {
    if (userError) {
      router.push("/login");
    }
  }, [userError, router]);

  // Loading state - show skeleton
  if (userLoading || !user) {
    return <SettingsSkeleton />;
  }

  // Error state
  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Icon icon="solar:danger-linear" className="mb-4 text-red-500" style={{ fontSize: "2rem" }} />
        <p className="text-[#090b0c]/50">Failed to load settings</p>
      </div>
    );
  }

  // Success state - render dumb view component
  return (
    <SettingsView
      user={user}
      workspaces={workspaces}
      devices={deviceTokens}
      cloudConfig={cloudConfig || { drive: { configured: false, connected: false }, dropbox: { configured: false, connected: false } }}
    />
  );
}
