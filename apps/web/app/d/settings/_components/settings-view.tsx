import { ProfileForm } from "@/components/shell/profile-form";
import { CloudConnections } from "@/components/shell/cloud-connections";
import { DeviceList } from "@/components/shell/device-list";
import { getUserInitials, formatDate } from "@/lib/client/format";

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

interface SettingsViewProps {
  user: User;
  workspaces: Workspace[];
  devices: DeviceToken[];
  cloudConfig: CloudConfig;
}

export function SettingsView({ user, workspaces, devices, cloudConfig }: SettingsViewProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-9 border-b border-black/[.07] pb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-px w-4 bg-[#090b0c]/40" />
          <p className="text-[0.6875rem] font-normal uppercase tracking-[0.14rem] text-[#090b0c]/45">
            Settings
          </p>
        </div>
        <h1 className="text-[2.25rem] font-normal leading-[0.98] tracking-tight text-[#090b0c] md:text-[2.75rem]">
          Your <span className="font-serif-italic">account</span>
        </h1>
      </div>

      <section className="mb-6 rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#090b0c] text-lg font-medium text-white">
            {getUserInitials(user.name ?? user.email ?? "?")}
          </div>
          <div>
            <h2 className="text-lg font-medium tracking-tight">{user.name ?? "Account"}</h2>
            <p className="text-[0.875rem] text-[#090b0c]/50">Member since {formatDate(user.createdAt)}</p>
          </div>
        </div>
        <ProfileForm initialName={user.name ?? ""} email={user.email ?? ""} />
      </section>

      <section className="mb-6">
        <CloudConnections drive={cloudConfig.drive} dropbox={cloudConfig.dropbox} />
      </section>

      <section className="mb-6 rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <h2 className="mb-1 text-lg font-medium tracking-tight">Connected devices</h2>
        <p className="mb-3 text-[0.875rem] text-[#090b0c]/50">
          Devices that can upload recordings to your account. Revoke any you don&apos;t recognize.
        </p>
        <DeviceList devices={devices} />
      </section>

      <section className="rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <h2 className="mb-4 text-lg font-medium tracking-tight">Workspaces</h2>
        <ul className="divide-y divide-black/[.06]">
          {workspaces.map((ws) => (
            <li key={ws.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/[.06] text-[0.8125rem] font-medium">
                  {getUserInitials(ws.name)}
                </span>
                <div>
                  <p className="text-[0.9375rem] font-medium">{ws.name}</p>
                  <p className="text-[0.8125rem] text-[#090b0c]/45">
                    {ws.videos.length} {ws.videos.length === 1 ? "video" : "videos"}
                  </p>
                </div>
              </div>
              {ws.id === user.id && (
                <span className="rounded-full bg-black/[.06] px-2.5 py-1 text-[0.75rem] text-[#090b0c]/60">
                  Active
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
