"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

type SlaStatus = {
  firstResponseDue: string | null;
  resolutionDue: string | null;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
};

function formatCountdown(dueIso: string): string {
  const diff = new Date(dueIso).getTime() - Date.now();

  if (diff <= 0) return "Overdue";

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${remainingMinutes}m`;
}

export function SlaCountdown({ ticketId }: { ticketId: string }) {
  const [sla, setSla] = useState<SlaStatus | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    apiClient<{ data: SlaStatus | null }>(`/api/tickets/${ticketId}/sla`)
      .then((res) => setSla(res.data))
      .catch(() => {});
  }, [ticketId]);

  // Tick every minute to update countdown
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!sla) return null;

  const hasAnyDeadline = sla.firstResponseDue || sla.resolutionDue;
  if (!hasAnyDeadline) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        SLA
      </h3>

      {sla.firstResponseDue && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">First response</span>
          <span
            className={
              sla.firstResponseBreached
                ? "font-semibold text-red-600"
                : "font-medium text-amber-600"
            }
          >
            {formatCountdown(sla.firstResponseDue)}
          </span>
        </div>
      )}

      {sla.resolutionDue && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Resolution</span>
          <span
            className={
              sla.resolutionBreached
                ? "font-semibold text-red-600"
                : "font-medium text-amber-600"
            }
          >
            {formatCountdown(sla.resolutionDue)}
          </span>
        </div>
      )}
    </div>
  );
}
