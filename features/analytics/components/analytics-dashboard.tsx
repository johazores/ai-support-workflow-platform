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
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
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
  const max = Math.max(...data.map((item) => (item[valueKey] as number) || 0), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const label = String(item[labelKey]);
        const value = (item[valueKey] as number) || 0;
        const percentage = (value / max) * 100;

        return (
          <div key={label} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-3 text-xs">
            <span className="truncate capitalize text-slate-600 dark:text-slate-400">
              {label}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-500 dark:bg-teal-400"
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
            <span className="text-right font-medium text-slate-700 dark:text-slate-300">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VolumeChart({ data }: { data: AnalyticsData["ticketVolume"] }) {
  const max = Math.max(...data.map((point) => point.count), 1);

  return (
    <div
      className="flex h-48 items-end gap-1.5 sm:gap-2"
      role="img"
      aria-label="Ticket volume for the last 30 days"
    >
      {data.map((point) => {
        const percentage = (point.count / max) * 100;

        return (
          <div key={point.date} className="group relative flex h-full min-w-0 flex-1 items-end">
            <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block dark:bg-white dark:text-slate-950">
              {point.date}: {point.count}
            </div>
            <div className="flex h-full w-full items-end rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
              <div
                className="w-full rounded bg-slate-800 transition-colors group-hover:bg-teal-500 dark:bg-slate-300 dark:group-hover:bg-teal-400"
                style={{ height: `${Math.max(percentage, 2)}%` }}
              />
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
      .then((response) => setData(response.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3" aria-label="Loading analytics">
        {[0, 1, 2].map((item) => (
          <div key={item} className="skeleton-shimmer h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="py-10 text-center text-sm text-slate-500">
        Analytics could not be loaded. Refresh the page to try again.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total tickets" value={data.totalTickets} />
        <StatCard label="Open tickets" value={data.openTickets} />
        <StatCard
          label="Average response"
          value={
            data.avgResponseTimeMinutes !== null
              ? `${data.avgResponseTimeMinutes}m`
              : "No data"
          }
        />
      </div>

      <Card>
        <div className="mb-5">
          <h3 className="font-semibold text-slate-950 dark:text-white">
            Ticket volume
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            New tickets during the last 30 days
          </p>
        </div>
        <VolumeChart data={data.ticketVolume} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-950 dark:text-white">
            Tickets by status
          </h3>
          <BarChart
            data={data.statusBreakdown}
            labelKey="status"
            valueKey="count"
          />
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-950 dark:text-white">
            Tickets by priority
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
