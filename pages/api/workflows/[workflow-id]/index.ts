import type { NextApiRequest, NextApiResponse } from "next";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { deleteWorkflowRule } from "@/features/workflows/services/workflow-mutation-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const workflowId = req.query["workflow-id"];
  if (typeof workflowId !== "string") {
    return res.status(400).json({ message: "Invalid workflow id" });
  }

  try {
    await deleteWorkflowRule({
      organizationId: auth.user.organizationId,
      workflowId,
    });

    await recordAuditEvent({
      actorType: "user",
      userId: auth.user.id,
      organizationId: auth.user.organizationId,
      action: "workflow.deleted",
      targetType: "WorkflowRule",
      targetId: workflowId,
    });

    return res.status(200).json({ data: { deleted: true } });
  } catch {
    return res.status(404).json({ message: "Workflow not found" });
  }
}
