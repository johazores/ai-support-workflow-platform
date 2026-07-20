import type { Metadata } from "next";
import { RootAdminShell } from "@/components/layout/root-admin-shell";
import { SystemSettingsManager } from "@/features/system-settings/components/system-settings-manager";
import { listSystemSettings } from "@/features/system-settings/services/system-setting-service";
import { requireRootAdmin } from "@/features/root-auth/services/root-auth-guard-service";

export const metadata: Metadata = {
  title: "Environment | Root Admin",
  robots: { index: false, follow: false },
};

export default async function RootSettingsPage() {
  const rootAdmin = await requireRootAdmin();
  const settings = await listSystemSettings();

  return (
    <RootAdminShell rootAdmin={rootAdmin}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Configuration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Environment Management
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Manage runtime settings through the database. Sensitive values are encrypted
          with AES-256-GCM and normal read endpoints return masked values only.
        </p>
      </div>

      <SystemSettingsManager settings={settings} />
    </RootAdminShell>
  );
}
