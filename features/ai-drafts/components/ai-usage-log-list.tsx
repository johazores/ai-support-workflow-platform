import { getAiUsageLogs } from "@/features/ai-drafts/services/ai-usage-query-service";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

type AiUsageLogListProps = {
  organizationId: string;
};

export async function AiUsageLogList({
  organizationId,
}: AiUsageLogListProps) {
  const logs = await getAiUsageLogs(organizationId);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 className="font-semibold text-slate-950 dark:text-white">
          AI Usage Logs
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Recent AI draft generation attempts for this workspace.
        </p>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {logs.map((log) => (
          <article key={log.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  {log.provider} · {log.model}
                </h3>

                {log.error && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {log.error}
                  </p>
                )}
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  log.success
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                }`}
              >
                {log.success ? "Success" : "Failed"}
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {formatDateTime(String(log.createdAt))}
            </p>
          </article>
        ))}

        {logs.length === 0 && (
          <EmptyState
            icon="chart"
            title="No AI usage logs yet"
            description="Workspace logs will appear here when AI drafts are generated."
          />
        )}
      </div>
    </div>
  );
}
