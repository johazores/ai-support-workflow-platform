import { requirePermission } from "@/features/auth/services/auth-guard-service";
import { AiUsageLogList } from "@/features/ai-drafts/components/ai-usage-log-list";

export default async function AiLogsPage() {
  const user = await requirePermission("ai-logs:read");

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          AI operations
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          AI activity
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Review provider usage, successful generations, and failures for this
          workspace.
        </p>
      </div>

      <AiUsageLogList organizationId={user.organizationId} />
    </section>
  );
}
