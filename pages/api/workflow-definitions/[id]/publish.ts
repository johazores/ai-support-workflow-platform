import type { NextApiRequest, NextApiResponse } from "next";
import { publishVersionedWorkflow } from "@/features/workflows/services/workflow-definition-service";
import { WorkflowDefinitionError } from "@/features/workflows/services/workflow-definition-validation";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid workflow ID" });
  }

  try {
    const workflow = await publishVersionedWorkflow({
      organizationId: auth.user.organizationId,
      workflowId: id,
      userId: auth.user.id,
    });
    return res.status(200).json({ data: workflow });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Workflow not found" ||
        error.message === "Workflow version not found")
    ) {
      return res.status(404).json({ message: error.message });
    }
    if (error instanceof WorkflowDefinitionError) {
      return res.status(400).json({
        message: "Workflow is not ready to publish",
        issues: error.issues,
      });
    }

    console.error("Failed to publish workflow", error);
    return res.status(500).json({ message: "Failed to publish workflow" });
  }
}
