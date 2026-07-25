import { apiClient } from "@/lib/api-client";

export type WorkflowDraftTestExecution = {
  id: string;
  status: string;
  workflowId: string;
  workflowVersionId: string;
  triggerType: string;
  error?: string | null;
  createdAt?: string;
  finishedAt?: string | null;
};

export async function testWorkflowDraftClient(
  workflowId: string,
  ticketId: string,
) {
  const result = await apiClient<{ data: WorkflowDraftTestExecution }>(
    `/api/workflow-definitions/${encodeURIComponent(workflowId)}/test`,
    { method: "POST", body: { ticketId } },
  );
  return result.data;
}
