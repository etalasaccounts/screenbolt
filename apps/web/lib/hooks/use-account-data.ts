import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
}

interface Workspace {
  id: string;
  name: string;
  videos: { id: string }[];
}

interface DeviceToken {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

interface CloudConfig {
  drive: { configured: boolean; connected: boolean };
  dropbox: { configured: boolean; connected: boolean };
}

async function fetchCurrentUser(): Promise<User> {
  const res = await fetch("/api/user");
  if (!res.ok) throw new Error("Failed to load user");
  const body = await res.json();
  return body.data;
}

async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await fetch("/api/workspaces");
  if (!res.ok) throw new Error("Failed to load workspaces");
  const body = await res.json();
  return body.data.workspaces;
}

async function fetchDeviceTokens(): Promise<DeviceToken[]> {
  const res = await fetch("/api/devices");
  if (!res.ok) throw new Error("Failed to load device tokens");
  const body = await res.json();
  return body.data;
}

async function fetchCloudConnections(): Promise<CloudConfig> {
  const res = await fetch("/api/cloud-config");
  if (!res.ok) throw new Error("Failed to load cloud config");
  const body = await res.json();
  return body.data;
}

const queryConfig = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: fetchCurrentUser,
    ...queryConfig,
  });
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
    ...queryConfig,
  });
}

export function useDeviceTokens() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: fetchDeviceTokens,
    ...queryConfig,
  });
}

export function useCloudConnections() {
  return useQuery({
    queryKey: ["cloud-config"],
    queryFn: fetchCloudConnections,
    ...queryConfig,
  });
}
