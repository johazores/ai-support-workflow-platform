"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateWorkflowStatus } from "@/features/workflows/services/workflow-client-service";

type WorkflowStatusToggleProps = {
  workflowId: string;
  isActive: boolean;
};

export function WorkflowStatusToggle({
  workflowId,
  isActive,
}: WorkflowStatusToggleProps) {
  const router = useRouter();
  const [currentIsActive, setCurrentIsActive] = useState(isActive);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  async function handleToggle() {
    const nextIsActive = !currentIsActive;
    setCurrentIsActive(nextIsActive);
    setIsSaving(true);

    try {
      await updateWorkflowStatus(workflowId, nextIsActive);
      toast(nextIsActive ? "Workflow enabled." : "Workflow disabled.");
      router.refresh();
    } catch {
      setCurrentIsActive(isActive);
      toast("Failed to update workflow.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleToggle}
      disabled={isSaving}
    >
      {currentIsActive ? "Active" : "Inactive"}
    </Button>
  );
}
