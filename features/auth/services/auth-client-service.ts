import { apiClient } from "@/lib/api-client";

export async function login(email: string, password: string) {
  await apiClient("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function logout() {
  await apiClient("/api/auth/logout", { method: "POST" });
}
