import { apiClient } from "@/lib/api-client";
import type { TicketStatus, TicketSummary } from "../types/ticket";

export async function fetchTickets(params: {
  search?: string;
  status?: string;
}): Promise<TicketSummary[]> {
  const query = new URLSearchParams();

  if (params.search) query.append("search", params.search);
  if (params.status) query.append("status", params.status);

  const result = await apiClient<{ data: TicketSummary[] }>(
    `/api/tickets?${query}`,
  );

  return result.data;
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
