import Link from "next/link";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";

import { AppHeader } from "@/components/layout/app-header";
export default async function AdminPage() {
  const user = await requireAdmin();
  return (
    <>
      <AppHeader user={user} />
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Dashboard
            </h1>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/admin/workflows"
              className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-slate-200"
            >
              <h2 className="font-semibold text-slate-950 group-hover:text-slate-700">
                Workflows
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Manage workflow automation rules.
              </p>
            </Link>

            <Link
              href="/admin/ai-logs"
              className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-slate-200"
            >
              <h2 className="font-semibold text-slate-950 group-hover:text-slate-700">
                AI Logs
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                View AI usage, success rate, and errors.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
