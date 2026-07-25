"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ApiError, apiClient } from "@/lib/api-client";

type WorkflowExecutionCancelButtonProps = {
  executionId: string;
  status: string;
};

const cancellableStatuses = new Set(["queued", "running", "cancelling"]);

export function WorkflowExecutionCancelButton({
  executionId,
  status,
}: WorkflowExecutionCancelButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = useState(false);

  if (!cancellableStatuses.has(status)) return null;

  async function cancelExecution() {
    setIsCancelling(true);
    try {
      const result = await apiClient<{ data: { status: string } }>(
        `/api/workflow-executions/${encodeURIComponent(executionId)}/cancel`,
        { method: "POST" },
      );
      toast(
        result.data.status === "cancelled"
          ? "Workflow execution cancelled"
          : "Workflow cancellation requested",
        "success",
      );
      router.refresh();
    } catch (error) {
      toast(
        error instanceof ApiError
          ? error.message
          : "Failed to cancel workflow execution",
        "error",
      );
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={cancelExecution}
      isLoading={isCancelling}
      disabled={status === "cancelling"}
    >
      {status === "cancelling" ? "Cancellation pending" : "Cancel execution"}
    </Button>
  );
}
