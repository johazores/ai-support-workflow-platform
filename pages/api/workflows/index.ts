import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { createWorkflowRule } from "@/features/workflows/services/workflow-mutation-service";

const triggerSchema = z.object({
  field: z.enum(["subject", "priority", "status"]),
  operator: z.enum(["equals", "contains"]),
  value: z.string().trim().min(1).max(500),
});

const actionSchema = z.object({
  type: z.enum(["change-status", "assign-ticket", "generate-draft", "add-tag"]),
  value: z.string().trim().min(1).max(500),
});

const createWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional().default(""),
  trigger: triggerSchema,
  actions: z.array(actionSchema).min(1).max(20),
});

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

  const result = createWorkflowSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const workflow = await createWorkflowRule({
      organizationId: auth.user.organizationId,
      name: result.data.name,
      description: result.data.description,
      trigger: JSON.stringify(result.data.trigger),
      actions: result.data.actions,
    });

    await recordAuditEvent({
      actorType: "user",
      userId: auth.user.id,
      organizationId: auth.user.organizationId,
      action: "workflow.created",
      targetType: "WorkflowRule",
      targetId: workflow.id,
      metadata: { name: workflow.name },
    });

    return res.status(201).json({ data: workflow });
  } catch (error) {
    console.error("Failed to create workflow", error);
    return res.status(500).json({ message: "Failed to create workflow" });
  }
}
