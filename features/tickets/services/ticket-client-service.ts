import { apiClient } from "@/lib/api-client";
import type { TicketStatus, TicketSummary } from "../types/ticket";

type FetchTicketsResult = {
  tickets: TicketSummary[];
  nextCursor: string | null;
};

export async function fetchTickets(params: {
  search?: string;
  status?: string;
  priority?: string;
  cursor?: string;
  limit?: number;
}): Promise<FetchTicketsResult> {
  const query = new URLSearchParams();

  if (params.search) query.append("search", params.search);
  if (params.status) query.append("status", params.status);
  if (params.priority) query.append("priority", params.priority);
  if (params.cursor) query.append("cursor", params.cursor);
  if (params.limit) query.append("limit", String(params.limit));

  const result = await apiClient<{
    data: TicketSummary[];
    nextCursor: string | null;
  }>(`/api/tickets?${query}`);

  return { tickets: result.data, nextCursor: result.nextCursor };
}

export async function sendReply(ticketId: string, body: string) {
  await apiClient(`/api/tickets/${ticketId}/reply`, {
    method: "POST",
    body: { body },
  });
}

export async function addInternalNote(ticketId: string, body: string) {
  await apiClient(`/api/tickets/${ticketId}/notes`, {
    method: "POST",
    body: { body },
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
) {
  await apiClient(`/api/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function assignTicket(
  ticketId: string,
  assigneeName: string | null,
  assigneeEmail: string | null,
) {
  await apiClient(`/api/tickets/${ticketId}/assign`, {
    method: "PATCH",
    body: { assigneeName, assigneeEmail },
  });
}
