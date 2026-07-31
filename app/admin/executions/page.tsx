import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { listWorkflowExecutions } from "@/features/workflows/services/workflow-execution-query-service";

function statusClass(status: string) {
  if (status === "succeeded") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (status === "failed") {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  }
  if (status === "running") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default async function WorkflowExecutionsPage() {
  const user = await requireSupervisor();
  const executions = await listWorkflowExecutions(user.organizationId);

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          AI & automation
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Execution history
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Inspect persisted workflow runs, triggers, outputs, and failures.
        </p>
      </div>

      <Card className="overflow-hidden p-0 dark:bg-slate-900 dark:ring-slate-800">
        {executions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No workflows have executed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Workflow
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Trigger
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {executions.map((execution) => (
                  <tr
                    key={execution.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/executions/${execution.id}`}
                        className="font-semibold text-slate-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-white"
                      >
                        {execution.workflowName}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                          execution.status,
                        )}`}
                      >
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                      {execution.triggerType}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {(execution.startedAt || execution.createdAt)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19)}{" "}
                      UTC
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
