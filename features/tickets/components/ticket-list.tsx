"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type {
  TicketStatus,
  TicketSummary,
} from "@/features/tickets/types/ticket";
import { highlightText } from "@/features/tickets/utils/highlight-text";
import { fetchTickets } from "@/features/tickets/services/ticket-client-service";

const ticketStatuses: TicketStatus[] = ["open", "pending", "closed"];

export function TicketList() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTickets() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchTickets({
          search: search || undefined,
          status: status || undefined,
        });

        setTickets(data);
      } catch {
        setError("Failed to load tickets. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(loadTickets, 300);

    return () => clearTimeout(timeout);
  }, [search, status]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search tickets..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
        />

        <Select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as TicketStatus | "")
          }
          className="w-32"
        >
          <option value="">All Status</option>

          {ticketStatuses.map((ticketStatus) => (
            <option key={ticketStatus} value={ticketStatus}>
              {ticketStatus.charAt(0).toUpperCase() + ticketStatus.slice(1)}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch("");
            setStatus("");
          }}
        >
          Clear
        </Button>
      </div>

      {loading && (
        <p className="text-sm text-slate-500 animate-pulse">
          Loading tickets...
        </p>
      )}
      {error && (
        <Alert type="error" dismissible onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/inbox/${ticket.id}`}
            className="group block px-5 py-4 transition-colors hover:bg-slate-50/80"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 group-hover:text-slate-950">
                  {highlightText(ticket.subject, search)}
                </h3>

                <p className="mt-1 truncate text-sm text-slate-500">
                  {highlightText(ticket.customerName, search)}
                  <span className="mx-1.5 text-slate-300">&middot;</span>
                  {highlightText(ticket.customerEmail, search)}
                </p>
              </div>

              <StatusBadge status={ticket.status} />
            </div>
          </Link>
        ))}

        {!loading && tickets.length > 0 && (
          <div className="px-4 py-3 text-center text-xs font-medium text-slate-500">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} found
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-600">No tickets found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
