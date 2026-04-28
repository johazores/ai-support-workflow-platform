import { apiClient } from "@/lib/api-client";

type Tag = {
  id: string;
  name: string;
  color: string;
};

export async function fetchTags() {
  return apiClient<Tag[]>("/api/tags");
}

export async function createTag(name: string, color?: string) {
  return apiClient<Tag>("/api/tags", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
}

export async function setTicketTags(ticketId: string, tagIds: string[]) {
  return apiClient<void>(`/api/tickets/${ticketId}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tagIds }),
  });
}
