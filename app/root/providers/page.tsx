import type { Metadata } from "next";
import { RootAdminShell } from "@/components/layout/root-admin-shell";
import { ProviderManager } from "@/features/providers/components/provider-manager";
import { listProviders } from "@/features/providers/services/provider-service";
import { requireRootAdmin } from "@/features/root-auth/services/root-auth-guard-service";

export const metadata: Metadata = {
  title: "Providers | Root Admin",
  robots: { index: false, follow: false },
};

export default async function RootProvidersPage() {
  const rootAdmin = await requireRootAdmin();
  const providers = await listProviders();

  return (
    <RootAdminShell rootAdmin={rootAdmin}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Integrations
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Provider Management
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Enable providers, configure default models, rotate encrypted
          credentials, set priority, and test connectivity without changing
          application code.
        </p>
      </div>

      <ProviderManager providers={providers} />
    </RootAdminShell>
  );
}
