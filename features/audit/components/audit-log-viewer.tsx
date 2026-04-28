"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

type AuditLogEntry = {
  id: string;
  ticketId: string;
  ticketSubject: string;
  type: string;
  message: string;
  createdAt: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const typeColors: Record<string, string> = {
  "status-change": "bg-blue-100 text-blue-700",
  assignment: "bg-purple-100 text-purple-700",
  "workflow-executed": "bg-amber-100 text-amber-700",
  "email-received": "bg-green-100 text-green-700",
  "ticket-reopened": "bg-red-100 text-red-700",
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    apiClient<{ data: string[] }>("/api/audit-logs?meta=types")
      .then((res) => setTypes(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);

    const query = new URLSearchParams();
    if (typeFilter) query.append("type", typeFilter);

    apiClient<{
      logs: AuditLogEntry[];
      nextCursor: string | null;
      total: number;
    }>(`/api/audit-logs?${query}`)
      .then((res) => {
        setLogs(res.logs);
        setNextCursor(res.nextCursor);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [typeFilter]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);

    try {
      const query = new URLSearchParams({ cursor: nextCursor });
      if (typeFilter) query.append("type", typeFilter);

      const res = await apiClient<{
        logs: AuditLogEntry[];
        nextCursor: string | null;
        total: number;
      }>(`/api/audit-logs?${query}`);

      setLogs((prev) => [...prev, ...res.logs]);
      setNextCursor(res.nextCursor);
    } catch {
      // Silently fail
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <span className="text-xs text-slate-500">{total} total entries</span>
      </div>

      {loading ? (
        <p className="animate-pulse text-sm text-slate-500">
          Loading audit logs...
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-medium text-slate-500">Time</th>
                <th className="px-4 py-2 font-medium text-slate-500">Type</th>
                <th className="px-4 py-2 font-medium text-slate-500">Ticket</th>
                <th className="px-4 py-2 font-medium text-slate-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                    {formatTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        typeColors[log.type] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {log.type}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2.5">
                    <Link
                      href={`/inbox/${log.ticketId}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {log.ticketSubject}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{log.message}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No audit log entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {nextCursor && (
            <div className="border-t border-slate-100 px-4 py-3 text-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
