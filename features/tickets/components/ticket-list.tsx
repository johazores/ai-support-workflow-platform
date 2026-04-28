"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  TicketStatus,
  TicketSummary,
} from "@/features/tickets/types/ticket";

const ticketStatuses: TicketStatus[] = ["open", "pending", "closed"];

export function TicketList() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (search) params.append("search", search);
        if (status) params.append("status", status);

        const response = await fetch(`/api/tickets?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch tickets");
        }

        const result: { data: TicketSummary[] } = await response.json();

        setTickets(result.data);
      } catch (error) {
        console.error(error);
        setError("Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(() => {
      fetchTickets();
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, status]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm"
        />

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as TicketStatus | "")
          }
          className="rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">All</option>

          {ticketStatuses.map((ticketStatus) => (
            <option key={ticketStatus} value={ticketStatus}>
              {ticketStatus}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatus("");
          }}
          className="rounded-xl border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="divide-y rounded-2xl border bg-white">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/inbox/${ticket.id}`}
            className="block p-4 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {ticket.subject}
                </h3>

                <p className="text-sm text-slate-500">
                  {ticket.customerName} · {ticket.customerEmail}
                </p>
              </div>

              <StatusBadge status={ticket.status} />
            </div>
          </Link>
        ))}

        <p className="text-sm text-slate-500">
          {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} found
        </p>

        {!loading && tickets.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500">
            No tickets found.
          </div>
        )}
      </div>
    </div>
  );
}
