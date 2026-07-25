import {
  claimNextWorkflowExecution,
  executeClaimedWorkflowExecution,
  WorkflowExecutionError,
  WorkflowLeaseLostError,
} from "@/features/workflows/services/versioned-workflow-runtime";
import { logError, logWarn } from "@/lib/structured-logger";

export type WorkflowWorkerIterationResult = {
  claimed: boolean;
  executionId?: string;
  outcome?: "completed" | "retry-scheduled" | "cancelled" | "failed" | "lease-lost";
};

export async function runWorkflowWorkerIteration(input: {
  workerId: string;
  leaseMs?: number;
}): Promise<WorkflowWorkerIterationResult> {
  const claim = await claimNextWorkflowExecution(input);
  if (!claim) return { claimed: false };

  try {
    const execution = await executeClaimedWorkflowExecution(claim);
    const status = execution?.status;
    return {
      claimed: true,
      executionId: claim.execution.id,
      outcome:
        status === "queued"
          ? "retry-scheduled"
          : status === "cancelled"
            ? "cancelled"
            : status === "failed"
              ? "failed"
              : "completed",
    };
  } catch (error) {
    if (error instanceof WorkflowLeaseLostError) {
      logWarn("workflow.worker.lease_lost", {
        workerId: input.workerId,
        executionId: claim.execution.id,
      });
      return {
        claimed: true,
        executionId: claim.execution.id,
        outcome: "lease-lost",
      };
    }

    if (error instanceof WorkflowExecutionError) {
      return {
        claimed: true,
        executionId: claim.execution.id,
        outcome: "failed",
      };
    }

    logError("workflow.worker.unexpected_error", {
      workerId: input.workerId,
      executionId: claim.execution.id,
      error,
    });
    throw error;
  }
}
