import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { getAnalytics } from "@/features/analytics/services/analytics-service";
import { getAiUsageLogs } from "@/features/ai-drafts/services/ai-usage-query-service";
import { listUsers } from "@/features/auth/services/user-management-service";
import { listWorkflowExecutions } from "@/features/workflows/services/workflow-execution-query-service";

type OperationsDashboardProps = {
  organizationId: string;
  viewerName: string;
};

type MetricProps = {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
};

const quickActions = [
  ["/inbox", "Open inbox", "Review customer conversations", "inbox"],
  ["/admin/workflows", "Build workflow", "Create an automation", "workflow"],
  ["/admin/ai-logs", "Review AI activity", "Inspect provider attempts", "sparkles"],
  ["/admin/analytics", "View analytics", "Explore support performance", "analytics"],
] as const;

function percent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function responseTime(minutes: number | null) {
  if (minutes === null) return "No data";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function Metric({ label, value, detail, icon }: MetricProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </Card>
  );
}

function HealthRow({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {label}
          </p>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {detail}
        </p>
      </div>
    </div>
  );
}

export async function OperationsDashboard({
  organizationId,
  viewerName,
}: OperationsDashboardProps) {
  const [analytics, executions, aiLogs, users] = await Promise.all([
    getAnalytics(organizationId),
    listWorkflowExecutions(organizationId, { limit: 8 }),
    getAiUsageLogs(organizationId, { limit: 50 }),
    listUsers(organizationId),
  ]);

  const statuses = new Map<string, number>(
    analytics.statusBreakdown.map(
      (item): [string, number] => [item.status, item.count],
    ),
  );
  const priorities = new Map<string, number>(
    analytics.priorityBreakdown.map(
      (item): [string, number] => [item.priority, item.count],
    ),
  );
  const resolved =
    (statuses.get("closed") ?? 0) + (statuses.get("resolved") ?? 0);
  const resolutionRate = analytics.totalTickets
    ? (resolved / analytics.totalTickets) * 100
    : 0;

  const aiSuccess = aiLogs.filter((log) => log.success).length;
  const aiRate = aiLogs.length ? (aiSuccess / aiLogs.length) * 100 : 0;
  const workflowSuccess = executions.filter(
    (execution) => execution.status === "succeeded",
  ).length;
  const workflowRate = executions.length
    ? (workflowSuccess / executions.length) * 100
    : 0;
  const failedWorkflows = executions.filter(
    (execution) => execution.status === "failed",
  ).length;

  const volume = analytics.ticketVolume.slice(-14);
  const maxVolume = Math.max(...volume.map((point) => point.count), 1);
  const firstName = viewerName.trim().split(" ")[0] || "there";

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-950/10 sm:px-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-200 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              Live support operations
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Good to see you, {firstName}.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Monitor customer demand, AI reliability, and workflow health from
              one operational view.
            </p>
          </div>
          <Link
            href="/inbox"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:self-auto"
          >
            Go to inbox
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="support-health-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Support health
        </p>
        <h2
          id="support-health-heading"
          className="mb-4 mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white"
        >
          Workspace at a glance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Open tickets"
            value={String(analytics.openTickets)}
            detail={`${priorities.get("high") ?? 0} high-priority tickets in the workspace.`}
            icon="inbox"
          />
          <Metric
            label="Resolution rate"
            value={percent(resolutionRate)}
            detail={`${resolved} of ${analytics.totalTickets} tickets are resolved.`}
            icon="check"
          />
          <Metric
            label="Average first response"
            value={responseTime(analytics.avgResponseTimeMinutes)}
            detail="Based on tickets with at least one agent response."
            icon="activity"
          />
          <Metric
            label="Active team"
            value={String(users.length)}
            detail="Active organization members available for support work."
            icon="team"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Support volume
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                New tickets during the last 14 days
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {volume.reduce((sum, point) => sum + point.count, 0)} total
            </span>
          </div>
          <div className="flex h-64 items-end gap-2 px-5 pb-6 pt-8 sm:px-6">
            {volume.map((point) => {
              const height = Math.max((point.count / maxVolume) * 100, 4);
              return (
                <div
                  key={point.date}
                  className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  title={`${point.date}: ${point.count} tickets`}
                >
                  <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100">
                    {point.count}
                  </span>
                  <div className="flex h-44 w-full items-end rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                    <div
                      className="w-full rounded-md bg-slate-800 transition-colors group-hover:bg-teal-500 dark:bg-slate-300 dark:group-hover:bg-teal-400"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-950 dark:text-white">
            AI and automation health
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Reliability from recent tenant activity
          </p>
          <div className="mt-5 space-y-3">
            <HealthRow
              label="AI generation"
              value={aiLogs.length ? percent(aiRate) : "No activity"}
              detail={`${aiSuccess} successful and ${aiLogs.length - aiSuccess} failed attempts.`}
              icon="sparkles"
            />
            <HealthRow
              label="Workflow execution"
              value={executions.length ? percent(workflowRate) : "No runs"}
              detail={`${workflowSuccess} succeeded and ${failedWorkflows} failed runs.`}
              icon="automation"
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Recent workflow activity
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Latest persisted runs for this organization
              </p>
            </div>
            <Link
              href="/admin/executions"
              className="text-xs font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white"
            >
              View all
            </Link>
          </div>
          {executions.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">
              No workflow executions yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {executions.slice(0, 6).map((execution) => (
                <Link
                  key={execution.id}
                  href={`/admin/executions/${execution.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:hover:bg-slate-800/60 sm:px-6"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Icon name="workflow" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {execution.workflowName}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {execution.triggerType}
                    </span>
                  </span>
                  <span className="text-xs font-medium capitalize text-slate-500">
                    {execution.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-0">
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Quick actions
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Common support operations
            </p>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickActions.map(([href, label, detail, icon]) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-2xl p-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-slate-800/70"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-teal-400 dark:group-hover:text-slate-950">
                  <Icon name={icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {detail}
                  </span>
                </span>
                <Icon
                  name="arrow-right"
                  className="h-4 w-4 text-slate-300 group-hover:text-slate-600 dark:text-slate-700 dark:group-hover:text-slate-300"
                />
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
