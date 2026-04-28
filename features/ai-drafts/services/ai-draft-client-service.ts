import { apiClient } from "@/lib/api-client";

export async function generateDraft(params: {
  subject: string;
  customerName: string;
  customerMessage: string;
}): Promise<string> {
  const result = await apiClient<{ data: { draft: string } }>(
    "/api/ai-drafts/generate",
    { method: "POST", body: params },
  );

  return result.data.draft;
}

export async function saveDraft(ticketId: string, body: string) {
  await apiClient("/api/ai-drafts/save", {
    method: "POST",
    body: { ticketId, body },
  });
}

export async function sendDraft(draftId: string) {
  await apiClient(`/api/ai-drafts/${draftId}/send`, { method: "POST" });
}
