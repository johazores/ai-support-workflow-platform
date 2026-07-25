import { ApiError, apiClient } from "@/lib/api-client";
import type { WorkflowDefinition } from "@/features/workflows/types/workflow-definition";

export type WorkflowSummary = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  currentVersion: number;
  latestVersion: number | null;
  latestVersionStatus: string | null;
  publishedVersion: number | null;
  updatedAt: string;
};

export type WorkflowDetail = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  currentVersion: number;
  publishedVersion: number | null;
  version: {
    id: string;
    version: number;
    status: string;
    definition: WorkflowDefinition;
  };
};

export type WorkflowVersionSummary = {
  id: string;
  workflowId: string;
  version: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
};

export type WorkflowEditorOptions = {
  users: Array<{ id: string; name: string; email: string; role: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
};

export type WorkflowExecutionResult = {
  id: string;
  status: string;
  createdAt?: string;
  finishedAt?: string | null;
  error?: string | null;
};

type WorkflowPayload = {
  name: string;
  description?: string;
  definition: WorkflowDefinition;
};

export async function fetchVersionedWorkflows() {
  const result = await apiClient<{ data: WorkflowSummary[] }>(
    "/api/workflow-definitions",
  );
  return result.data;
}

export async function fetchVersionedWorkflow(id: string) {
  const result = await apiClient<{ data: WorkflowDetail }>(
    `/api/workflow-definitions/${encodeURIComponent(id)}`,
  );
  return result.data;
}

export async function createVersionedWorkflowClient(input: WorkflowPayload) {
  const result = await apiClient<{ data: WorkflowDetail }>(
    "/api/workflow-definitions",
    { method: "POST", body: input },
  );
  return result.data;
}

export async function saveVersionedWorkflowClient(
  id: string,
  input: WorkflowPayload,
) {
  const result = await apiClient<{ data: WorkflowDetail }>(
    `/api/workflow-definitions/${encodeURIComponent(id)}`,
    { method: "PUT", body: input },
  );
  return result.data;
}

export async function publishVersionedWorkflowClient(id: string) {
  const result = await apiClient<{ data: WorkflowDetail }>(
    `/api/workflow-definitions/${encodeURIComponent(id)}/publish`,
    { method: "POST" },
  );
  return result.data;
}

export async function archiveVersionedWorkflowClient(id: string) {
  await apiClient(`/api/workflow-definitions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchWorkflowVersions(id: string) {
  const result = await apiClient<{ data: WorkflowVersionSummary[] }>(
    `/api/workflow-definitions/${encodeURIComponent(id)}/versions`,
  );
  return result.data;
}

export async function fetchWorkflowEditorOptions() {
  const result = await apiClient<{ data: WorkflowEditorOptions }>(
    "/api/workflow-definitions/options",
  );
  return result.data;
}

export async function runVersionedWorkflow(id: string, ticketId: string) {
  const result = await apiClient<{ data: WorkflowExecutionResult }>(
    `/api/workflow-definitions/${encodeURIComponent(id)}/run`,
    { method: "POST", body: { ticketId } },
  );
  return result.data;
}

export function workflowApiErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "Workflow request failed";
  }

  const issues = Array.isArray(error.details?.issues)
    ? error.details?.issues.filter((issue): issue is string => typeof issue === "string")
    : [];

  return issues.length > 0 ? `${error.message}: ${issues.join(" ")}` : error.message;
}
