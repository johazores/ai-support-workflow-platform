import Link from "next/link";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { WorkflowList } from "@/features/workflows/components/workflow-list";
import { CreateWorkflowForm } from "@/features/workflows/components/create-workflow-form";
import { AppHeader } from "@/components/layout/app-header";

export default async function WorkflowsAdminPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">
        <section className="mx-auto max-w-6xl">
          <Link
            href="/admin"
            className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950 dark:hover:text-white"
          >
            ← Back to admin
          </Link>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Automation
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Workflows
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Rules are isolated to the active organization and all mutations
              are authorized server-side.
            </p>
          </div>

          <div className="mb-6">
            <CreateWorkflowForm />
          </div>

          <WorkflowList organizationId={user.organizationId} />
        </section>
      </main>
    </>
  );
}
