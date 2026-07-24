import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  archiveVersionedWorkflow,
  getVersionedWorkflow,
  saveVersionedWorkflow,
} from "@/features/workflows/services/workflow-definition-service";
import { WorkflowDefinitionError } from "@/features/workflows/services/workflow-definition-validation";
import type { WorkflowDefinition } from "@/features/workflows/types/workflow-definition";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const saveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  definition: z.unknown(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireTenantApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid workflow ID" });
  }

  if (req.method === "GET") {
    const workflow = await getVersionedWorkflow(auth.user.organizationId, id);
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    return res.status(200).json({ data: workflow });
  }

  if (req.method === "PUT") {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const workflow = await saveVersionedWorkflow({
        organizationId: auth.user.organizationId,
        userId: auth.user.id,
        workflowId: id,
        name: parsed.data.name,
        description: parsed.data.description,
        definition: parsed.data.definition as WorkflowDefinition,
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
          message: "Invalid workflow definition",
          issues: error.issues,
        });
      }

      console.error("Failed to save workflow definition", error);
      return res.status(500).json({ message: "Failed to save workflow" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await archiveVersionedWorkflow({
        organizationId: auth.user.organizationId,
        workflowId: id,
      });
      return res.status(204).end();
    } catch (error) {
      if (error instanceof Error && error.message === "Workflow not found") {
        return res.status(404).json({ message: error.message });
      }

      console.error("Failed to archive workflow", error);
      return res.status(500).json({ message: "Failed to archive workflow" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
