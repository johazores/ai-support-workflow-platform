import type { NextApiRequest } from "next";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { deleteWorkflowRule } from "@/features/workflows/services/workflow-mutation-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

function workflowIdFrom(req: NextApiRequest) {
  const workflowId = req.query["workflow-id"];
  if (typeof workflowId !== "string") {
    throw new TenantApiError(400, "Invalid workflow id");
  }
  return workflowId;
}

export default createTenantApiRoute({
  DELETE: tenantApiRoute({
    permission: "workflows:manage",
    rateLimit: "sensitive",
    mapError: (error) =>
      error instanceof Error && error.message === "Workflow not found"
        ? { status: 404, message: error.message }
        : null,
    handle: async ({ req, res, user }) => {
      const workflowId = workflowIdFrom(req);
      await deleteWorkflowRule({
        organizationId: user.organizationId,
        workflowId,
      });

      await recordAuditEvent({
        actorType: "user",
        userId: user.id,
        organizationId: user.organizationId,
        action: "workflow.deleted",
        targetType: "WorkflowRule",
        targetId: workflowId,
      });

      return res.status(200).json({ data: { deleted: true } });
    },
    unexpectedErrorMessage: "Failed to delete workflow",
  }),
});
