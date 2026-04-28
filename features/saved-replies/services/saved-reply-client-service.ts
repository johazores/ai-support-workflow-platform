import { apiClient } from "@/lib/api-client";

type SavedReply = {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
};

export async function fetchSavedReplies() {
  const result = await apiClient<{ data: SavedReply[] }>("/api/saved-replies");
  return result.data;
}

export async function createSavedReply(input: {
  title: string;
  body: string;
  shortcut?: string;
}) {
  const result = await apiClient<{ data: SavedReply }>("/api/saved-replies", {
    method: "POST",
    body: input,
  });
  return result.data;
}

export async function updateSavedReply(
  id: string,
  input: { title: string; body: string; shortcut?: string },
) {
  const result = await apiClient<{ data: SavedReply }>(
    `/api/saved-replies/${id}`,
    {
      method: "PUT",
      body: input,
    },
  );
  return result.data;
}

export async function deleteSavedReply(id: string) {
  return apiClient<void>(`/api/saved-replies/${id}`, {
    method: "DELETE",
  });
}
