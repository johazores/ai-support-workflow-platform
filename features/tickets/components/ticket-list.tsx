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
        setError("Failed to load tickets. Please try again.");
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

      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/inbox/${ticket.id}`}
            className="block p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {highlightText(ticket.subject, search)}
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  {highlightText(ticket.customerName, search)} ·{" "}
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
