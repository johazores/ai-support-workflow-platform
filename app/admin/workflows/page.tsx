import Link from "next/link";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { VersionedWorkflowBuilder } from "@/features/workflows/components/versioned-workflow-builder";

export default async function WorkflowsAdminPage() {
  await requireAdmin();

  return (
    <section className="mx-auto max-w-[1560px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            AI & automation
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Workflow builder
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Build tenant-owned automations visually. Draft versions remain safe
            to edit while the last published version continues running.
          </p>
        </div>

        <Link
          href="/admin/executions"
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Execution history
        </Link>
      </div>

      <VersionedWorkflowBuilder />
    </section>
  );
}
