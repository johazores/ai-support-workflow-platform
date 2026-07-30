import type { Metadata } from "next";
import { RootAdminShell } from "@/components/layout/root-admin-shell";
import { SystemSettingsManager } from "@/features/system-settings/components/system-settings-manager";
import { listSystemSettings } from "@/features/system-settings/services/system-setting-service";
import { requireRootAdmin } from "@/features/root-auth/services/root-auth-guard-service";

export const metadata: Metadata = {
  title: "Runtime Settings | Root Admin",
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
          Runtime Settings
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          This database-backed CMS is the source of truth for administrator-managed
          runtime configuration. Sensitive values are encrypted with AES-256-GCM,
          and read endpoints return masked values only.
        </p>
      </div>

      <SystemSettingsManager settings={settings} />
    </RootAdminShell>
  );
}
