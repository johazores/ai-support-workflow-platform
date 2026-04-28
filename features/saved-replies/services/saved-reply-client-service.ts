import { apiClient } from "@/lib/api-client";

type SavedReply = {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
};

export async function fetchSavedReplies() {
  return apiClient<SavedReply[]>("/api/saved-replies");
}

export async function createSavedReply(input: {
  title: string;
  body: string;
  shortcut?: string;
}) {
  return apiClient<SavedReply>("/api/saved-replies", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSavedReply(
  id: string,
  input: { title: string; body: string; shortcut?: string },
) {
  return apiClient<SavedReply>(`/api/saved-replies/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteSavedReply(id: string) {
  return apiClient<void>(`/api/saved-replies/${id}`, {
    method: "DELETE",
  });
}
