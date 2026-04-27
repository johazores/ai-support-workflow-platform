import Link from "next/link";
import { WorkflowList } from "@/features/workflows/components/workflow-list";

export default function WorkflowsAdminPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to admin
        </Link>

        <div className="mb-6">
          <p className="text-sm font-medium text-slate-500">Admin</p>
          <h1 className="text-3xl font-bold text-slate-950">Workflows</h1>
        </div>

        <WorkflowList />
      </section>
    </main>
  );
}
