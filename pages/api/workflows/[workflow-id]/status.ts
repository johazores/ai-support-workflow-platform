import type { NextApiRequest } from "next";
import { z } from "zod";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { updateWorkflowStatus } from "@/features/workflows/services/workflow-mutation-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const updateWorkflowStatusSchema = z.object({ isActive: z.boolean() });

function workflowIdFrom(req: NextApiRequest) {
  const workflowId = req.query["workflow-id"];
  if (typeof workflowId !== "string") {
    throw new TenantApiError(400, "Invalid workflow id");
  }
  return workflowId;
}

export default createTenantApiRoute({
  PATCH: tenantApiRoute({
    permission: "workflows:manage",
    schema: updateWorkflowStatusSchema,
    rateLimit: "sensitive",
    mapError: (error) =>
      error instanceof Error && error.message === "Workflow not found"
        ? { status: 404, message: error.message }
        : null,
    handle: async ({ req, res, user, input }) => {
      const workflow = await updateWorkflowStatus({
        organizationId: user.organizationId,
        workflowId: workflowIdFrom(req),
        isActive: input.isActive,
      });

      await recordAuditEvent({
        actorType: "user",
        userId: user.id,
        organizationId: user.organizationId,
        action: "workflow.status-updated",
        targetType: "WorkflowRule",
        targetId: workflow.id,
        metadata: { isActive: workflow.isActive },
      });

      return res.status(200).json({ data: workflow });
    },
    unexpectedErrorMessage: "Failed to update workflow status",
  }),
});
