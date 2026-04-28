import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdmin } from "@/features/auth/services/auth-guard-service";
import { AiUsageLogList } from "@/features/ai-drafts/components/ai-usage-log-list";

export default async function AiLogsPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />

      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <section className="mx-auto max-w-6xl">
          <Link
            href="/admin"
            className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Back to admin
          </Link>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              AI Logs
            </h1>
          </div>

          <AiUsageLogList />
        </section>
      </main>
    </>
  );
}
