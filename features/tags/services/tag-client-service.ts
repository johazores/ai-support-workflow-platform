import { apiClient } from "@/lib/api-client";

type Tag = {
  id: string;
  name: string;
  color: string;
};

export async function fetchTags() {
  const result = await apiClient<{ data: Tag[] }>("/api/tags");
  return result.data;
}

export async function createTag(name: string, color?: string) {
  const result = await apiClient<{ data: Tag }>("/api/tags", {
    method: "POST",
    body: { name, color },
  });
  return result.data;
}

export async function setTicketTags(ticketId: string, tagIds: string[]) {
  return apiClient<void>(`/api/tickets/${ticketId}/tags`, {
    method: "PUT",
    body: { tagIds },
  });
}
