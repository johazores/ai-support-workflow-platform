"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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

  async function handleToggle() {
    const nextIsActive = !currentIsActive;

    setCurrentIsActive(nextIsActive);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextIsActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update workflow status");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      setCurrentIsActive(isActive);
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
