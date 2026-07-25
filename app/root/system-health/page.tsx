import type { Metadata } from "next";
import { RootAdminShell } from "@/components/layout/root-admin-shell";
import { Card } from "@/components/ui/card";
import { requireRootAdmin } from "@/features/root-auth/services/root-auth-guard-service";
import { getWorkflowQueueHealth } from "@/features/workflows/services/versioned-workflow-runtime";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "System Health | Root Admin",
  robots: { index: false, follow: false },
};

export default async function RootSystemHealthPage() {
  const rootAdmin = await requireRootAdmin();

  let databaseStatus: "healthy" | "unavailable" = "healthy";
  try {
    await prisma.organization.count();
  } catch {
    databaseStatus = "unavailable";
  }

  const [failedProviders, failedExecutions, activeRootSessions, queueHealth] =
    await Promise.all([
      prisma.providerCredential.count({
        where: { isActive: true, lastTestStatus: "failed" },
      }),
      prisma.workflowExecution.count({ where: { status: "failed" } }),
      prisma.rootSession.count({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      getWorkflowQueueHealth(),
    ]).catch(() => [
      0,
      0,
      0,
      {
        queued: 0,
        running: 0,
        cancelling: 0,
        failed: 0,
        oldestQueuedAt: null,
      },
    ] as const);

  const oldestQueuedAge = queueHealth.oldestQueuedAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(queueHealth.oldestQueuedAt).getTime()) / 1_000,
        ),
      )
    : null;
  const queueNeedsAttention =
    queueHealth.cancelling > 0 ||
    (oldestQueuedAge !== null && oldestQueuedAge > 120);

  const checks = [
    {
      label: "Database",
      value: databaseStatus,
      detail:
        databaseStatus === "healthy"
          ? "Database query completed successfully"
          : "Database query failed",
      healthy: databaseStatus === "healthy",
    },
    {
      label: "Provider credentials",
      value: failedProviders === 0 ? "healthy" : "attention",
      detail: `${failedProviders} failed connection test${failedProviders === 1 ? "" : "s"}`,
      healthy: failedProviders === 0,
    },
    {
      label: "Workflow executions",
      value: failedExecutions === 0 ? "healthy" : "attention",
      detail: `${failedExecutions} failed execution${failedExecutions === 1 ? "" : "s"}`,
      healthy: failedExecutions === 0,
    },
    {
      label: "Workflow queue",
      value: queueNeedsAttention ? "attention" : "healthy",
      detail: `${queueHealth.queued} queued, ${queueHealth.running} running, ${queueHealth.cancelling} cancelling${oldestQueuedAge === null ? "" : `; oldest queued ${oldestQueuedAge}s`}`,
      healthy: !queueNeedsAttention,
    },
    {
      label: "Root sessions",
      value: "active",
      detail: `${activeRootSessions} active session${activeRootSessions === 1 ? "" : "s"}`,
      healthy: true,
    },
  ];

  return (
    <RootAdminShell rootAdmin={rootAdmin}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operations
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          System Health
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Live database connectivity, provider failures, workflow queue and
          execution health, and Root Admin session visibility.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {checks.map((check) => (
          <Card key={check.label} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{check.label}</p>
                <p className="mt-2 text-xl font-semibold capitalize text-slate-950 dark:text-white">
                  {check.value}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {check.detail}
                </p>
              </div>
              <span
                className={`mt-1 h-3 w-3 rounded-full ${check.healthy ? "bg-emerald-500" : "bg-amber-500"}`}
                aria-label={check.healthy ? "Healthy" : "Needs attention"}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-semibold text-slate-950 dark:text-white">
          Probe endpoints
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Use <code>/api/health</code> for process liveness and{" "}
          <code>/api/readiness</code> for database readiness checks in hosting
          or container orchestration. Run the workflow worker separately with{" "}
          <code>npm run workflow:worker</code>.
        </p>
      </Card>
    </RootAdminShell>
  );
}
