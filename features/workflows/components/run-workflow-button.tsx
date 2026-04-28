"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

type RunWorkflowButtonProps = {
  ticketId: string;
};

export function RunWorkflowButton({ ticketId }: RunWorkflowButtonProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );
  const [message, setMessage] = useState("");

  async function handleRunWorkflows() {
    setIsRunning(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/workflows/run`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to run workflow");
      }

      setMessage(
        result.data.executed
          ? "Workflow executed successfully."
          : "No matching workflow rules found.",
      );
      setMessageType("success");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to run workflow. Please try again.");
      setMessageType("error");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-950">
          Workflow Automation
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Run active workflow rules against this ticket.
        </p>
      </div>

      <div className="space-y-4">
        <Button
          fullWidth
          disabled={isRunning}
          isLoading={isRunning}
          onClick={handleRunWorkflows}
        >
          Run Workflows
        </Button>

        {messageType && (
          <Alert
            type={messageType}
            dismissible
            onDismiss={() => {
              setMessage("");
              setMessageType(null);
            }}
          >
            {message}
          </Alert>
        )}
      </div>
    </Card>
  );
}
