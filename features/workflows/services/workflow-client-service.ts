import { apiClient } from "@/lib/api-client";

export async function createWorkflow(data: {
  name: string;
  description: string;
  trigger: { field: string; operator: string; value: string };
  actions: Array<{ type: string; value: string }>;
}) {
  await apiClient("/api/workflows", { method: "POST", body: data });
}

export async function deleteWorkflow(workflowId: string) {
  await apiClient(`/api/workflows/${workflowId}`, { method: "DELETE" });
}

export async function updateWorkflowStatus(
  workflowId: string,
  isActive: boolean,
) {
  await apiClient(`/api/workflows/${workflowId}/status`, {
    method: "PATCH",
    body: { isActive },
  });
}

export async function runWorkflows(ticketId: string): Promise<boolean> {
  const result = await apiClient<{ data: { executed: boolean } }>(
    `/api/tickets/${ticketId}/workflows/run`,
    { method: "POST" },
  );

  return result.data.executed;
}
