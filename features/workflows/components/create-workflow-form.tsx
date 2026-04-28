"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useAsyncAction } from "@/lib/use-async-action";
import { createWorkflow } from "@/features/workflows/services/workflow-client-service";

type WorkflowField = "subject" | "priority" | "status";
type WorkflowOperator = "equals" | "contains";
type WorkflowActionType =
  | "change-status"
  | "assign-ticket"
  | "generate-draft"
  | "add-tag";

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
  const { isLoading, message, messageType, execute, clearMessage } =
    useAsyncAction();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const success = await execute(async () => {
      await createWorkflow({
        name,
        description,
        trigger: { field, operator, value },
        actions: [{ type: actionType, value: actionValue }],
      });
      return "Workflow created successfully.";
    }, "Failed to create workflow. Please try again.");

    if (success) {
      setName("");
      setDescription("");
      router.refresh();
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
            <Select
              label="Field"
              value={field}
              onChange={(event) =>
                setField(event.target.value as WorkflowField)
              }
              fullWidth
            >
              <option value="priority">Priority</option>
              <option value="subject">Subject</option>
              <option value="status">Status</option>
            </Select>

            <Select
              label="Operator"
              value={operator}
              onChange={(event) =>
                setOperator(event.target.value as WorkflowOperator)
              }
              fullWidth
            >
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
            </Select>

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
            <Select
              label="Action Type"
              value={actionType}
              onChange={(event) =>
                setActionType(event.target.value as WorkflowActionType)
              }
              fullWidth
            >
              <option value="change-status">Change Status</option>
              <option value="assign-ticket">Assign Ticket</option>
              <option value="generate-draft">Generate Draft</option>
              <option value="add-tag">Add Tag</option>
            </Select>

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
          <Alert type={messageType} dismissible onDismiss={clearMessage}>
            {message}
          </Alert>
        )}

        <Button type="submit" fullWidth isLoading={isLoading}>
          {isLoading ? "Creating..." : "Create Workflow"}
        </Button>
      </form>
    </Card>
  );
}
