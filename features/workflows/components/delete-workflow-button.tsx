"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteWorkflowButtonProps = {
  workflowId: string;
};

export function DeleteWorkflowButton({
  workflowId,
}: DeleteWorkflowButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this workflow?",
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete workflow");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete workflow.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-full px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
