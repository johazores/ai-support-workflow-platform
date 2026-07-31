import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { requireSupervisor } from "@/features/auth/services/auth-guard-service";
import { getWorkflowExecution } from "@/features/workflows/services/workflow-execution-query-service";

type PageProps = {
  params: Promise<{ "execution-id": string }>;
};

function formatJson(value: unknown) {
  return value === null || value === undefined
    ? "—"
    : JSON.stringify(value, null, 2);
}

export default async function WorkflowExecutionDetailPage({
  params,
}: PageProps) {
  const user = await requireSupervisor();
  const resolvedParams = await params;
  const execution = await getWorkflowExecution(
    user.organizationId,
    resolvedParams["execution-id"],
  );
  if (!execution) notFound();

  return (
    <section className="mx-auto max-w-5xl">
      <Link
        href="/admin/executions"
        className="mb-6 inline-flex min-h-10 items-center rounded-lg px-1 text-sm font-medium text-slate-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-white"
      >
        ← Back to execution history
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Workflow execution
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {execution.workflowName}
          </h2>
          <p className="mt-2 break-all font-mono text-xs text-slate-500">
            {execution.id}
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium capitalize text-white dark:bg-white dark:text-slate-900">
          {execution.status}
        </span>
      </div>

      {execution.error && (
        <Card className="mb-6 border border-red-200 bg-red-50 p-5 ring-0 dark:border-red-900 dark:bg-red-950/30">
          <h3 className="font-semibold text-red-800 dark:text-red-300">
            Execution failed
          </h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {execution.error}
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {execution.steps.map((step, index) => (
          <Card
            key={step.id}
            className="p-5 dark:bg-slate-900 dark:ring-slate-800 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {step.nodeType}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{step.nodeId}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {step.status}
              </span>
            </div>

            {step.error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {step.error}
              </p>
            )}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Input
                </p>
                <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                  {formatJson(step.input)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Output
                </p>
                <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                  {formatJson(step.output)}
                </pre>
              </div>
            </div>
          </Card>
        ))}

        {execution.steps.length === 0 && (
          <Card className="p-8 text-center text-sm text-slate-500 dark:bg-slate-900 dark:ring-slate-800">
            This execution has no persisted steps.
          </Card>
        )}
      </div>
    </section>
  );
}
