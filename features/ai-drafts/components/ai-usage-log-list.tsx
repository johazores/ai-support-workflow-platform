import { getAiUsageLogs } from "@/features/ai-drafts/services/ai-usage-query-service";

export async function AiUsageLogList() {
  const logs = await getAiUsageLogs();

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-950">AI Usage Logs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Recent AI draft generation attempts.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {logs.map((log) => (
          <article key={log.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">
                  {log.provider} · {log.model}
                </h3>

                {log.error && (
                  <p className="mt-1 text-sm text-red-600">{log.error}</p>
                )}
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  log.success
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {log.success ? "Success" : "Failed"}
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {new Date(log.createdAt)
                .toISOString()
                .replace("T", " ")
                .slice(0, 19)}
            </p>
          </article>
        ))}

        {logs.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            No AI usage logs yet.
          </div>
        )}
      </div>
    </div>
  );
}
