import { apiClient } from "@/lib/api-client";

export type EmailLogEntry = {
  id: string;
  ticketId: string;
  messageId: string;
  to: string;
  subject: string;
  status: string;
  error: string | null;
  createdAt: string;
};

type EmailLogResponse = {
  logs: EmailLogEntry[];
  total: number;
};

export async function fetchEmailLogs(opts?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<EmailLogResponse> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));

  const qs = params.toString();
  const result = await apiClient<{ data: EmailLogResponse }>(
    `/api/email-logs${qs ? `?${qs}` : ""}`,
  );
  return result.data;
}
