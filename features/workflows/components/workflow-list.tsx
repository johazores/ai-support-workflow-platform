import { getWorkflowRules } from "@/features/workflows/services/workflow-query-service";

export async function WorkflowList() {
  const workflows = await getWorkflowRules();

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold text-slate-950">Workflow Rules</h2>
        <p className="mt-1 text-sm text-slate-500">
          Active automation rules used by the support inbox.
        </p>
      </div>

      <div className="divide-y">
        {workflows.map((workflow) => (
          <article key={workflow.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">
                  {workflow.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {workflow.description ?? "No description provided."}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {workflow.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Trigger
              </p>
              <pre className="mt-2 overflow-x-auto text-xs text-slate-700">
                {workflow.trigger}
              </pre>
            </div>
          </article>
        ))}

        {workflows.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            No workflows found.
          </div>
        )}
      </div>
    </div>
  );
}
