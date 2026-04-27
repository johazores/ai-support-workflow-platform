"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");

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
      setMessage("Workflow created.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Failed to create workflow.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-5 shadow-sm"
    >
      <h2 className="font-semibold text-slate-950">Create Workflow</h2>

      <div className="mt-4 space-y-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Workflow name"
          className="w-full rounded-xl border px-3 py-2 text-sm"
          required
        />

        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          className="w-full rounded-xl border px-3 py-2 text-sm"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={field}
            onChange={(event) => setField(event.target.value as WorkflowField)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="priority">Priority</option>
            <option value="subject">Subject</option>
            <option value="status">Status</option>
          </select>

          <select
            value={operator}
            onChange={(event) =>
              setOperator(event.target.value as WorkflowOperator)
            }
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
          </select>

          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Trigger value"
            className="rounded-xl border px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={actionType}
            onChange={(event) =>
              setActionType(event.target.value as WorkflowActionType)
            }
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="change-status">Change Status</option>
            <option value="assign-ticket">Assign Ticket</option>
            <option value="generate-draft">Generate Draft</option>
          </select>

          <input
            value={actionValue}
            onChange={(event) => setActionValue(event.target.value)}
            placeholder="Action value"
            className="rounded-xl border px-3 py-2 text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Create Workflow"}
        </button>

        {message && <p className="text-sm text-slate-500">{message}</p>}
      </div>
    </form>
  );
}
