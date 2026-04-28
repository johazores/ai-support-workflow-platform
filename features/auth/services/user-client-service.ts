import { apiClient } from "@/lib/api-client";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export async function fetchUsers() {
  const result = await apiClient<{ data: User[] }>("/api/users");
  return result.data;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const result = await apiClient<{ data: User }>("/api/users", {
    method: "POST",
    body: input,
  });
  return result.data;
}

export async function updateUserRole(id: string, role: string) {
  const result = await apiClient<{ data: User }>(`/api/users/${id}`, {
    method: "PATCH",
    body: { role },
  });
  return result.data;
}

export async function deleteUser(id: string) {
  return apiClient<void>(`/api/users/${id}`, {
    method: "DELETE",
  });
}
