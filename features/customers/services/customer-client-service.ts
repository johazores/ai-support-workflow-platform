import { apiClient } from "@/lib/api-client";

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  ticketCount: number;
  createdAt: string;
};

export async function fetchCustomers() {
  const result = await apiClient<{ data: CustomerSummary[] }>("/api/customers");
  return result.data;
}
