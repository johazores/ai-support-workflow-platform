"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAsyncAction } from "@/lib/use-async-action";
import { runWorkflows } from "@/features/workflows/services/workflow-client-service";

type RunWorkflowButtonProps = {
  ticketId: string;
};

export function RunWorkflowButton({ ticketId }: RunWorkflowButtonProps) {
  const router = useRouter();
  const { isLoading, message, messageType, execute, clearMessage } =
    useAsyncAction();

  async function handleRunWorkflows() {
    const success = await execute(async () => {
      const executed = await runWorkflows(ticketId);
      return executed
        ? "Workflow executed successfully."
        : "No matching workflow rules found.";
    }, "Failed to run workflow. Please try again.");

    if (success) {
      router.refresh();
    }
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Workflow Automation
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Run active workflow rules against this ticket.
        </p>
      </div>

      <div className="space-y-4">
        <Button
          fullWidth
          disabled={isLoading}
          isLoading={isLoading}
          onClick={handleRunWorkflows}
        >
          Run Workflows
        </Button>

        {messageType && (
          <Alert type={messageType} dismissible onDismiss={clearMessage}>
            {message}
          </Alert>
        )}
      </div>
    </Card>
  );
}
