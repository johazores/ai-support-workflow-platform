"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  TicketStatus,
  TicketSummary,
} from "@/features/tickets/types/ticket";
import { highlightText } from "@/features/tickets/utils/highlight-text";
import { fetchTickets } from "@/features/tickets/services/ticket-client-service";
import { fetchTags } from "@/features/tags/services/tag-client-service";
import { TagBadge } from "@/features/tags/components/tag-badge";

type Tag = { id: string; name: string; color: string };

const ticketStatuses: TicketStatus[] = ["open", "pending", "closed"];

export function TicketList() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    fetchTags()
      .then(setAllTags)
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function loadTickets() {
      setLoading(true);
      setError("");

      try {
        const result = await fetchTickets({
          search: search || undefined,
          status: status || undefined,
        });

        setTickets(result.tickets);
        setNextCursor(result.nextCursor);
      } catch {
        setError("Failed to load tickets. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(loadTickets, 300);

    return () => clearTimeout(timeout);
  }, [search, status]);

  const filteredTickets = tagFilter
    ? tickets.filter((t) => t.tagIds.includes(tagFilter))
    : tickets;

  const tagMap = new Map(allTags.map((t) => [t.id, t]));

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);

    try {
      const result = await fetchTickets({
        search: search || undefined,
        status: status || undefined,
        cursor: nextCursor,
      });

      setTickets((prev) => [...prev, ...result.tickets]);
      setNextCursor(result.nextCursor);
    } catch {
      setError("Failed to load more tickets.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search tickets..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
          aria-label="Search tickets"
        />

        <Select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as TicketStatus | "")
          }
          className="w-32"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>

          {ticketStatuses.map((ticketStatus) => (
            <option key={ticketStatus} value={ticketStatus}>
              {ticketStatus.charAt(0).toUpperCase() + ticketStatus.slice(1)}
            </option>
          ))}
        </Select>
        {allTags.length > 0 && (
          <Select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="w-32"
            aria-label="Filter by tag"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </Select>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            setSearch("");
            setStatus("");
            setTagFilter("");
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

      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:divide-slate-700 dark:bg-slate-800 dark:ring-slate-700">
        {filteredTickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/inbox/${ticket.id}`}
            className="group block px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
                  {highlightText(ticket.subject, search)}
                </h3>

                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  {highlightText(ticket.customerName, search)}
                  <span className="mx-1.5 text-slate-300">&middot;</span>
                  {highlightText(ticket.customerEmail, search)}
                </p>

                {ticket.tagIds.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ticket.tagIds.map((tagId) => {
                      const tag = tagMap.get(tagId);
                      return tag ? (
                        <TagBadge
                          key={tagId}
                          name={tag.name}
                          color={tag.color}
                        />
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <StatusBadge status={ticket.status} />
            </div>
          </Link>
        ))}

        {!loading && filteredTickets.length > 0 && (
          <div className="px-4 py-3 text-center text-xs font-medium text-slate-500">
            {filteredTickets.length}{" "}
            {filteredTickets.length === 1 ? "ticket" : "tickets"} shown
          </div>
        )}

        {!loading && nextCursor && !tagFilter && (
          <div className="px-4 py-3 text-center">
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

        {!loading && filteredTickets.length === 0 && (
          <EmptyState
            icon="search"
            title="No tickets found"
            description="Try adjusting your search or filters to find what you're looking for."
          />
        )}
      </div>
    </div>
  );
}
