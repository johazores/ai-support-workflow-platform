import { getWorkflowRules } from "@/features/workflows/services/workflow-query-service";
import { WorkflowStatusToggle } from "@/features/workflows/components/workflow-status-toggle";
import { DeleteWorkflowButton } from "@/features/workflows/components/delete-workflow-button";
import { EmptyState } from "@/components/ui/empty-state";
export async function WorkflowList() {
  const workflows = await getWorkflowRules();

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-950">Workflow Rules</h2>
        <p className="mt-1 text-sm text-slate-500">
          Active automation rules used by the support inbox.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
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

              <div className="flex items-center gap-2">
                <WorkflowStatusToggle
                  workflowId={workflow.id}
                  isActive={workflow.isActive}
                />

                <DeleteWorkflowButton workflowId={workflow.id} />
              </div>
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
          <EmptyState
            icon="file"
            title="No workflows yet"
            description="Create your first automation rule to streamline ticket handling."
          />
        )}
      </div>
    </div>
  );
}
