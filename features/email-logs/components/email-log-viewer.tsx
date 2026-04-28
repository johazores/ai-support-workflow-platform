"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import {
  fetchEmailLogs,
  type EmailLogEntry,
} from "@/features/email-logs/services/email-log-client-service";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "bounced", label: "Bounced" },
];

export function EmailLogViewer() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    fetchEmailLogs({
      status: statusFilter || undefined,
      limit,
      offset: page * limit,
    })
      .then((res) => {
        if (!cancelled) {
          setLogs(res.logs);
          setTotal(res.total);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) toast("Failed to load email logs", "error");
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, page, toast]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {total} {total === 1 ? "log" : "logs"}
        </span>
      </div>

      {!loaded ? (
        <p className="animate-pulse text-sm text-slate-500">Loading...</p>
      ) : logs.length === 0 ? (
        <EmptyState
          icon="search"
          title="No email logs"
          description="Email logs will appear here once emails are sent."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    To
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Subject
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Sent At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                      {log.to}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {log.subject}
                    </td>
                    <td className="px-5 py-3">
                      <StatusDot status={log.status} error={log.error} />
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-700">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40 dark:text-slate-400"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40 dark:text-slate-400"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusDot({
  status,
  error,
}: {
  status: string;
  error: string | null;
}) {
  const colors: Record<string, string> = {
    sent: "bg-green-400",
    failed: "bg-red-400",
    bounced: "bg-amber-400",
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={`inline-block h-2 w-2 rounded-full ${colors[status] ?? "bg-slate-300"}`}
      />
      <span className="capitalize text-slate-600 dark:text-slate-300">
        {status}
      </span>
      {error && (
        <span className="text-red-500" title={error}>
          !
        </span>
      )}
    </span>
  );
}
