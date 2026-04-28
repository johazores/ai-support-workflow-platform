"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRelativeTime } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

type PastTicket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
};

type CustomerData = {
  id: string;
  name: string;
  email: string;
  tickets: PastTicket[];
};

export function CustomerHistory({
  customerId,
  currentTicketId,
}: {
  customerId: string;
  currentTicketId: string;
}) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<{ data: CustomerData }>(`/api/customers/${customerId}`)
      .then((res) => setCustomer(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Customer History
        </h2>
        <p className="mt-3 animate-pulse text-sm text-slate-400">Loading...</p>
      </aside>
    );
  }

  if (!customer) return null;

  const otherTickets = customer.tickets.filter((t) => t.id !== currentTicketId);

  return (
    <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Customer History
      </h2>

      <div className="mt-3 text-sm">
        <p className="font-medium text-slate-900 dark:text-slate-100">
          {customer.name}
        </p>
        <p className="text-slate-500 dark:text-slate-400">{customer.email}</p>
        <p className="mt-1 text-xs text-slate-400">
          {customer.tickets.length}{" "}
          {customer.tickets.length === 1 ? "ticket" : "tickets"} total
        </p>
      </div>

      {otherTickets.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-400">Other tickets</p>
          {otherTickets.slice(0, 5).map((ticket) => (
            <Link
              key={ticket.id}
              href={`/inbox/${ticket.id}`}
              className="block rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                  {ticket.subject}
                </p>
                <StatusBadge status={ticket.status} showDot={false} />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatRelativeTime(ticket.createdAt)}
              </p>
            </Link>
          ))}
          {otherTickets.length > 5 && (
            <p className="text-xs text-slate-400">
              +{otherTickets.length - 5} more
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
