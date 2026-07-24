import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  createVersionedWorkflow,
  listVersionedWorkflows,
} from "@/features/workflows/services/workflow-definition-service";
import { WorkflowDefinitionError } from "@/features/workflows/services/workflow-definition-validation";
import type { WorkflowDefinition } from "@/features/workflows/types/workflow-definition";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const createSchema = z.object({
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

  if (req.method === "GET") {
    const workflows = await listVersionedWorkflows(auth.user.organizationId);
    return res.status(200).json({ data: workflows });
  }

  if (req.method === "POST") {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const workflow = await createVersionedWorkflow({
        organizationId: auth.user.organizationId,
        userId: auth.user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        definition: parsed.data.definition as WorkflowDefinition,
      });
      return res.status(201).json({ data: workflow });
    } catch (error) {
      if (error instanceof WorkflowDefinitionError) {
        return res.status(400).json({
          message: "Invalid workflow definition",
          issues: error.issues,
        });
      }

      console.error("Failed to create workflow definition", error);
      return res.status(500).json({ message: "Failed to create workflow" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
