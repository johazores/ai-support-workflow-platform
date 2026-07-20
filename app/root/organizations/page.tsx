import type { Metadata } from "next";
import { RootAdminShell } from "@/components/layout/root-admin-shell";
import { RootOrganizationList } from "@/features/organizations/components/root-organization-list";
import { listOrganizationsForRoot } from "@/features/organizations/services/root-organization-service";
import { requireRootAdmin } from "@/features/root-auth/services/root-auth-guard-service";

export const metadata: Metadata = {
  title: "Organizations | Root Admin",
  robots: { index: false, follow: false },
};

export default async function RootOrganizationsPage() {
  const rootAdmin = await requireRootAdmin();
  const organizations = await listOrganizationsForRoot();

  return (
    <RootAdminShell rootAdmin={rootAdmin}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Tenancy
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Organizations
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Review tenant usage and suspend or reactivate access at the platform level.
        </p>
      </div>

      <RootOrganizationList organizations={organizations} />
    </RootAdminShell>
  );
}
