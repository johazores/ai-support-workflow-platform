import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { updateWorkflowStatus } from "@/features/workflows/services/workflow-mutation-service";

const updateWorkflowStatusSchema = z.object({ isActive: z.boolean() });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const workflowId = req.query["workflow-id"];
  if (typeof workflowId !== "string") {
    return res.status(400).json({ message: "Invalid workflow id" });
  }

  const result = updateWorkflowStatusSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const workflow = await updateWorkflowStatus({
      organizationId: auth.user.organizationId,
      workflowId,
      isActive: result.data.isActive,
    });

    await recordAuditEvent({
      actorType: "user",
      userId: auth.user.id,
      organizationId: auth.user.organizationId,
      action: "workflow.status-updated",
      targetType: "WorkflowRule",
      targetId: workflow.id,
      metadata: { isActive: workflow.isActive },
    });

    return res.status(200).json({ data: workflow });
  } catch {
    return res.status(404).json({ message: "Workflow not found" });
  }
}
