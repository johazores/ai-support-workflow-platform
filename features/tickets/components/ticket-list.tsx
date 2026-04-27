"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TicketSummary } from "@/features/tickets/types/ticket";

export function TicketList() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTickets();
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [search, status]);

  async function fetchTickets() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search) params.append("search", search);
      if (status) params.append("status", status);

      const res = await fetch(`/api/tickets?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to fetch tickets");

      const data = await res.json();

      setTickets(data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* States */}
      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* List */}
      <div className="divide-y rounded-2xl border bg-white">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/inbox/${ticket.id}`}
            className="block p-4 hover:bg-slate-50"
          >
            <div className="flex justify-between items-start">
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

        {!loading && tickets.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500">
            No tickets found.
          </div>
        )}
      </div>
    </div>
  );
}
