import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { VersionedWorkflowBuilder } from "@/features/workflows/components/versioned-workflow-builder";

export default async function WorkflowsAdminPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">
        <section className="mx-auto max-w-[1560px]">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/admin"
                className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950 dark:hover:text-white"
              >
                ← Back to admin
              </Link>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Automation
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Workflow Builder
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                Build tenant-owned automations visually. Draft versions are safe to
                edit while the last published version continues running.
              </p>
            </div>

            <Link
              href="/admin/executions"
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
            >
              Execution history
            </Link>
          </div>

          <VersionedWorkflowBuilder />
        </section>
      </main>
    </>
  );
}
