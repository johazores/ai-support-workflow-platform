import { getWorkflowRules } from "@/features/workflows/services/workflow-query-service";
import { WorkflowStatusToggle } from "@/features/workflows/components/workflow-status-toggle";
import { DeleteWorkflowButton } from "@/features/workflows/components/delete-workflow-button";
import { EmptyState } from "@/components/ui/empty-state";

function describeTrigger(value: string) {
  try {
    const trigger = JSON.parse(value) as {
      field?: string;
      operator?: string;
      value?: string;
    };
    if (!trigger.field || !trigger.operator || !trigger.value) return value;
    return `${trigger.field} ${trigger.operator.replace("-", " ")} “${trigger.value}”`;
  } catch {
    return value;
  }
}

function describeActions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (action): action is { type: string; value: string } =>
        Boolean(action) &&
        typeof action === "object" &&
        typeof (action as { type?: unknown }).type === "string" &&
        typeof (action as { value?: unknown }).value === "string",
    )
    .map((action) => `${action.type.replaceAll("-", " ")}: ${action.value}`);
}

export async function WorkflowList({
  organizationId,
}: {
  organizationId: string;
}) {
  const workflows = await getWorkflowRules(organizationId);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 className="font-semibold text-slate-950 dark:text-white">
          Workflow Rules
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Active automation rules used by this workspace.
        </p>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {workflows.map((workflow) => {
          const actions = describeActions(workflow.actions);

          return (
            <article key={workflow.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
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

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Trigger
                  </p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    {describeTrigger(workflow.trigger)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Actions
                  </p>
                  {actions.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {actions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No valid actions configured.
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}

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
