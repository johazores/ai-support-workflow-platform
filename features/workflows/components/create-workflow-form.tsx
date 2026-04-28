"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

type WorkflowField = "subject" | "priority" | "status";
type WorkflowOperator = "equals" | "contains";
type WorkflowActionType = "change-status" | "assign-ticket" | "generate-draft";

export function CreateWorkflowForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [field, setField] = useState<WorkflowField>("priority");
  const [operator, setOperator] = useState<WorkflowOperator>("equals");
  const [value, setValue] = useState("high");
  const [actionType, setActionType] =
    useState<WorkflowActionType>("change-status");
  const [actionValue, setActionValue] = useState("pending");
  const [isSaving, setIsSaving] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          trigger: {
            field,
            operator,
            value,
          },
          actions: [
            {
              type: actionType,
              value: actionValue,
            },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to create workflow");
      }

      setName("");
      setDescription("");
      setMessage("Workflow created successfully.");
      setMessageType("success");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to create workflow. Please try again.");
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-950">
          Create Workflow
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Set up automated actions based on ticket attributes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Workflow Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g., High Priority Triage"
          fullWidth
          required
        />

        <TextArea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe what this workflow does"
          fullWidth
          rows={3}
        />

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">
            Trigger Conditions
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Field
              </label>
              <select
                value={field}
                onChange={(event) =>
                  setField(event.target.value as WorkflowField)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="priority">Priority</option>
                <option value="subject">Subject</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Operator
              </label>
              <select
                value={operator}
                onChange={(event) =>
                  setOperator(event.target.value as WorkflowOperator)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
              </select>
            </div>

            <Input
              label="Value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="e.g., high"
              required
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Action</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Action Type
              </label>
              <select
                value={actionType}
                onChange={(event) =>
                  setActionType(event.target.value as WorkflowActionType)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="change-status">Change Status</option>
                <option value="assign-ticket">Assign Ticket</option>
                <option value="generate-draft">Generate Draft</option>
              </select>
            </div>

            <Input
              label="Action Value"
              value={actionValue}
              onChange={(event) => setActionValue(event.target.value)}
              placeholder="e.g., pending"
              required
            />
          </div>
        </div>

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

        <Button type="submit" fullWidth isLoading={isSaving}>
          {isSaving ? "Creating..." : "Create Workflow"}
        </Button>
      </form>
    </Card>
  );
}
