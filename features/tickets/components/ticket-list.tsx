"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type {
  TicketPriority,
  TicketStatus,
  TicketSummary,
} from "@/features/tickets/types/ticket";
import { highlightText } from "@/features/tickets/utils/highlight-text";
import { fetchTickets } from "@/features/tickets/services/ticket-client-service";
import { fetchTags } from "@/features/tags/services/tag-client-service";
import { TagBadge } from "@/features/tags/components/tag-badge";
import { apiClient } from "@/lib/api-client";

type Tag = { id: string; name: string; color: string };

const ticketStatuses: TicketStatus[] = ["open", "pending", "closed"];
const ticketPriorities: TicketPriority[] = ["low", "normal", "high"];

export function TicketList() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");

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
          priority: priority || undefined,
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
  }, [search, status, priority]);

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
        priority: priority || undefined,
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredTickets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredTickets.map((t) => t.id)));
    }
  }

  async function executeBulkAction() {
    if (!bulkAction || !bulkValue || selected.size === 0) return;
    try {
      await apiClient("/api/tickets/bulk", {
        method: "POST",
        body: {
          ticketIds: Array.from(selected),
          action: bulkAction,
          value: bulkValue,
        },
      });
      toast(`Updated ${selected.size} tickets`);
      setSelected(new Set());
      setBulkAction("");
      setBulkValue("");
      // Reload tickets
      const result = await fetchTickets({
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
      });
      setTickets(result.tickets);
      setNextCursor(result.nextCursor);
    } catch {
      toast("Bulk action failed", "error");
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
        <Select
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as TicketPriority | "")
          }
          className="w-32"
          aria-label="Filter by priority"
        >
          <option value="">All Priority</option>
          {ticketPriorities.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
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
            setPriority("");
            setTagFilter("");
          }}
        >
          Clear
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100 dark:bg-blue-900/20 dark:ring-blue-800">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selected.size} selected
          </span>
          <select
            value={bulkAction}
            onChange={(e) => {
              setBulkAction(e.target.value);
              setBulkValue("");
            }}
            className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs dark:border-blue-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Bulk action"
          >
            <option value="">Action...</option>
            <option value="change-status">Change Status</option>
            <option value="change-priority">Change Priority</option>
          </select>
          {bulkAction === "change-status" && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs dark:border-blue-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Status value"
            >
              <option value="">Select...</option>
              {ticketStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          )}
          {bulkAction === "change-priority" && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs dark:border-blue-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Priority value"
            >
              <option value="">Select...</option>
              {ticketPriorities.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            disabled={!bulkAction || !bulkValue}
            onClick={executeBulkAction}
          >
            Apply
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            Clear selection
          </button>
        </div>
      )}

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
        {filteredTickets.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2 bg-slate-50/50 dark:bg-slate-700/30">
            <input
              type="checkbox"
              checked={
                selected.size === filteredTickets.length &&
                filteredTickets.length > 0
              }
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-slate-300"
              aria-label="Select all tickets"
            />
            <span className="text-xs text-slate-400">Select all</span>
          </div>
        )}
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50"
          >
            <input
              type="checkbox"
              checked={selected.has(ticket.id)}
              onChange={() => toggleSelect(ticket.id)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
              aria-label={`Select ticket ${ticket.subject}`}
            />
            <Link href={`/inbox/${ticket.id}`} className="group min-w-0 flex-1">
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
          </div>
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
