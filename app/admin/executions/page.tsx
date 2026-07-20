import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Card } from "@/components/ui/card";
import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { listWorkflowExecutions } from "@/features/workflows/services/workflow-execution-query-service";

function statusClass(status: string) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-red-50 text-red-700";
  if (status === "running") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default async function WorkflowExecutionsPage() {
  const user = await requireSupervisor();
  const executions = await listWorkflowExecutions(user.organizationId);

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">
        <section className="mx-auto max-w-6xl">
          <Link
            href="/admin"
            className="mb-8 inline-flex text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white"
          >
            ← Back to admin
          </Link>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Automation
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Execution History
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Inspect persisted workflow runs and their result for this organization.
            </p>
          </div>

          <Card className="overflow-hidden p-0">
            {executions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No workflows have executed yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900">
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
                      <tr key={execution.id}>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/executions/${execution.id}`}
                            className="font-semibold text-slate-950 hover:underline dark:text-white"
                          >
                            {execution.workflowName}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(execution.status)}`}
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
      </main>
    </>
  );
}
