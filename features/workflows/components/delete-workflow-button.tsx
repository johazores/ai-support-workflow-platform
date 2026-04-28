"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { deleteWorkflow } from "@/features/workflows/services/workflow-client-service";

type DeleteWorkflowButtonProps = {
  workflowId: string;
};

export function DeleteWorkflowButton({
  workflowId,
}: DeleteWorkflowButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await deleteWorkflow(workflowId);
      toast("Workflow deleted.");
      router.refresh();
    } catch {
      toast("Failed to delete workflow.", "error");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="text-red-600 hover:text-red-700"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>

      <ConfirmDialog
        open={showConfirm}
        title="Delete Workflow"
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      >
        Are you sure you want to delete this workflow? This action cannot be
        undone.
      </ConfirmDialog>
    </>
  );
}
