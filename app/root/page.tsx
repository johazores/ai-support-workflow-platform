import Link from "next/link";
import { RootAdminShell } from "@/components/layout/root-admin-shell";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/features/root-auth/services/root-auth-guard-service";

export default async function RootAdminDashboardPage() {
  const rootAdmin = await requireRootAdmin();
  const [organizations, providers, activeProviders, executions, auditEvents] =
    await Promise.all([
      prisma.organization.count(),
      prisma.provider.count(),
      prisma.provider.count({ where: { isEnabled: true } }),
      prisma.workflowExecution.count(),
      prisma.auditEvent.count(),
    ]);

  const metrics = [
    { label: "Organizations", value: organizations, href: "/root/organizations" },
    { label: "Providers", value: `${activeProviders}/${providers}`, href: "/root/providers" },
    { label: "Workflow executions", value: executions, href: "/root" },
    { label: "Audit events", value: auditEvents, href: "/root/audit-logs" },
  ];

  return (
    <RootAdminShell rootAdmin={rootAdmin}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Platform overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Root Administration
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Manage platform-wide providers, encrypted configuration, organizations,
          system health, and security activity independently from customer accounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link key={metric.label} href={metric.href}>
            <Card className="h-full p-5 transition-transform hover:-translate-y-0.5">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                {metric.value}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Configuration status
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Provider credentials and sensitive environment values are managed through
            encrypted records. Bootstrap-only secrets remain deployment settings.
          </p>
          <Link
            href="/root/settings"
            className="mt-5 inline-flex text-sm font-semibold text-slate-950 underline-offset-4 hover:underline dark:text-white"
          >
            Manage environment
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Security boundary
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Root sessions use a dedicated signing secret, persisted revocation records,
            login lockout, and a separate cookie from product-user sessions.
          </p>
          <Link
            href="/root/audit-logs"
            className="mt-5 inline-flex text-sm font-semibold text-slate-950 underline-offset-4 hover:underline dark:text-white"
          >
            Review audit activity
          </Link>
        </Card>
      </div>
    </RootAdminShell>
  );
}
