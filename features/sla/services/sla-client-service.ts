import { apiClient } from "@/lib/api-client";

type SlaPolicy = {
  id: string;
  name: string;
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
};

export async function fetchSlaPolicies() {
  const result = await apiClient<{ data: SlaPolicy[] }>("/api/sla-policies");
  return result.data;
}

export async function updateSlaPolicy(
  id: string,
  data: { firstResponseMinutes: number; resolutionMinutes: number },
) {
  const result = await apiClient<{ data: SlaPolicy }>(
    `/api/sla-policies/${id}`,
    {
      method: "PATCH",
      body: data,
    },
  );
  return result.data;
}
