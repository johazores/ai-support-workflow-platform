"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RunWorkflowButtonProps = {
  ticketId: string;
};

export function RunWorkflowButton({ ticketId }: RunWorkflowButtonProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRunWorkflows() {
    setIsRunning(true);
    setMessage("");

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
          ? "Workflow executed."
          : "No matching workflow rules.",
      );

      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to run workflow.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <aside className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-950">Workflow Automation</h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Run active workflow rules against this ticket.
      </p>

      <button
        type="button"
        onClick={handleRunWorkflows}
        disabled={isRunning}
        className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? "Running..." : "Run Workflows"}
      </button>

      {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
    </aside>
  );
}
