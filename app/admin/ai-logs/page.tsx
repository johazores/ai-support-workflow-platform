import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { AiUsageLogList } from "@/features/ai-drafts/components/ai-usage-log-list";

export default async function AiLogsPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />

      <main className="min-h-screen bg-slate-50 px-6 py-8">
        <section className="mx-auto max-w-6xl">
          <Link
            href="/admin"
            className="mb-6 inline-flex text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            ← Back to admin
          </Link>
          <Link
            href="/admin/ai-logs"
            className="rounded-2xl border bg-white p-5 shadow-sm hover:bg-slate-50"
          >
            <h2 className="font-semibold text-slate-950">AI Logs</h2>
            <p className="mt-2 text-sm text-slate-500">
              View AI usage, success rate, and errors.
            </p>
          </Link>

          <div className="mb-6">
            <p className="text-sm font-medium text-slate-500">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">AI Logs</h1>
          </div>

          <AiUsageLogList />
        </section>
      </main>
    </>
  );
}
