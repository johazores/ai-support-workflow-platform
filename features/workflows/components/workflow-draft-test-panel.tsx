"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  testWorkflowDraftClient,
  type WorkflowDraftTestExecution,
} from "@/features/workflows/services/workflow-draft-test-client-service";
import {
  fetchVersionedWorkflows,
  workflowApiErrorMessage,
  type WorkflowSummary,
} from "@/features/workflows/services/workflow-definition-client-service";
import { ApiError } from "@/lib/api-client";

export function WorkflowDraftTestPanel() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [workflowId, setWorkflowId] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [execution, setExecution] =
    useState<WorkflowDraftTestExecution | null>(null);
  const [failedExecutionId, setFailedExecutionId] = useState<string | null>(null);

  useEffect(() => {
    fetchVersionedWorkflows()
      .then((items) => {
        const available = items.filter((item) => item.status !== "archived");
        setWorkflows(available);
        setWorkflowId(available[0]?.id ?? "");
      })
      .catch((error) => toast(workflowApiErrorMessage(error), "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleTest() {
    if (!workflowId || !ticketId.trim()) return;
    setTesting(true);
    setExecution(null);
    setFailedExecutionId(null);

    try {
      const result = await testWorkflowDraftClient(workflowId, ticketId.trim());
      setExecution(result);
      toast("Draft test completed without changing the ticket", "success");
    } catch (error) {
      if (
        error instanceof ApiError &&
        typeof error.details?.executionId === "string"
      ) {
        setFailedExecutionId(error.details.executionId);
      }
      toast(workflowApiErrorMessage(error), "error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Safe test mode
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
            Test the latest draft
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Uses a real ticket to evaluate branches and validate tenant members/tags,
            while simulating actions in memory. It never changes the ticket, creates
            an AI draft, or sends a message.
          </p>
        </div>
        <Link
          href="/admin/executions"
          className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 dark:text-slate-300"
        >
          Test execution history
        </Link>
      </div>

      {loading ? (
        <p className="mt-5 animate-pulse text-sm text-slate-500">
          Loading workflows...
        </p>
      ) : workflows.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
          Save a workflow draft first, then test it here.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <Select
            label="Workflow"
            value={workflowId}
            onChange={(event) => {
              setWorkflowId(event.target.value);
              setExecution(null);
              setFailedExecutionId(null);
            }}
            options={workflows.map((workflow) => ({
              value: workflow.id,
              label: `${workflow.name} · latest v${workflow.latestVersion ?? "—"}`,
            }))}
            fullWidth
          />
          <Input
            label="Ticket ID"
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
            placeholder="Tenant ticket ID"
            maxLength={100}
            fullWidth
          />
          <Button
            onClick={handleTest}
            isLoading={testing}
            disabled={!workflowId || !ticketId.trim()}
          >
            Test draft safely
          </Button>
        </div>
      )}

      {execution && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900">
          Draft test {execution.status}. No live ticket changes were written.{" "}
          <Link
            href={`/admin/executions/${execution.id}`}
            className="font-medium underline underline-offset-4"
          >
            Inspect steps
          </Link>
        </div>
      )}

      {failedExecutionId && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900">
          The draft test reached a runtime validation failure, but no ticket mutation was
          applied.{" "}
          <Link
            href={`/admin/executions/${failedExecutionId}`}
            className="font-medium underline underline-offset-4"
          >
            Inspect the failed step
          </Link>
        </div>
      )}
    </section>
  );
}
