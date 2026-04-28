"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

type AnalyticsData = {
  totalTickets: number;
  openTickets: number;
  avgResponseTimeMinutes: number | null;
  ticketVolume: Array<{ date: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  priorityBreakdown: Array<{ priority: string; count: number }>;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

function BarChart({
  data,
  labelKey,
  valueKey,
}: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
}) {
  const max = Math.max(...data.map((d) => (d[valueKey] as number) || 0), 1);

  return (
    <div className="space-y-1.5">
      {data.map((item, i) => {
        const value = (item[valueKey] as number) || 0;
        const pct = (value / max) * 100;

        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-20 truncate text-slate-600">
              {String(item[labelKey])}
            </span>
            <div className="flex-1">
              <div
                className="h-4 rounded bg-blue-500"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="w-6 text-right font-medium text-slate-700">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VolumeChart({ data }: { data: AnalyticsData["ticketVolume"] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const barWidth = Math.max(100 / data.length, 2);

  return (
    <div className="flex h-32 items-end gap-px">
      {data.map((point) => {
        const pct = (point.count / max) * 100;

        return (
          <div
            key={point.date}
            className="group relative flex-1"
            style={{ minWidth: `${barWidth}%` }}
          >
            <div
              className="w-full rounded-t bg-blue-400 transition-colors group-hover:bg-blue-600"
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
              {point.date}: {point.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<{ data: AnalyticsData }>("/api/analytics")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="animate-pulse text-sm text-slate-500">
        Loading analytics...
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Failed to load analytics.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Tickets" value={data.totalTickets} />
        <StatCard label="Open Tickets" value={data.openTickets} />
        <StatCard
          label="Avg Response Time"
          value={
            data.avgResponseTimeMinutes !== null
              ? `${data.avgResponseTimeMinutes}m`
              : "N/A"
          }
        />
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Ticket Volume (30 days)
        </h3>
        <VolumeChart data={data.ticketVolume} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            By Status
          </h3>
          <BarChart
            data={data.statusBreakdown}
            labelKey="status"
            valueKey="count"
          />
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            By Priority
          </h3>
          <BarChart
            data={data.priorityBreakdown}
            labelKey="priority"
            valueKey="count"
          />
        </Card>
      </div>
    </div>
  );
}
