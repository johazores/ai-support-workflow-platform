"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteWorkflow } from "@/features/workflows/services/workflow-client-service";

type DeleteWorkflowButtonProps = {
  workflowId: string;
};

export function DeleteWorkflowButton({
  workflowId,
}: DeleteWorkflowButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this workflow?"))
      return;

    setIsDeleting(true);

    try {
      await deleteWorkflow(workflowId);
      router.refresh();
    } catch {
      alert("Failed to delete workflow.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="tertiary"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-700"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </Button>
  );
}
