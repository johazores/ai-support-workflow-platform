import { randomUUID } from "node:crypto";
import { z } from "zod";
import { enqueuePublishedWorkflowsForTicket } from "@/features/workflows/services/versioned-workflow-runtime";
import {
  createTenantApiRoute,
  tenantApiRoute,
} from "@/lib/tenant-api-route";

const runSchema = z.object({
  workflowId: z.string().trim().min(1).max(100),
  ticketId: z.string().trim().min(1).max(100),
});

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "workflows:manage",
    rateLimit: "sensitive",
    parse: (req) => ({
      workflowId: req.query.id,
      ticketId: req.body?.ticketId,
    }),
    schema: runSchema,
    async handle({ user, input, res }) {
      const executions = await enqueuePublishedWorkflowsForTicket({
        organizationId: user.organizationId,
        ticketId: input.ticketId,
        workflowId: input.workflowId,
        triggerType: "manual",
        idempotencyKey: `manual:${user.id}:${randomUUID()}`,
      });

      if (executions.length === 0) {
        return res.status(409).json({
          message: "Workflow is not published with a manual trigger",
        });
      }

      return res.status(202).json({ data: executions[0] });
    },
    mapError(error) {
      if (error instanceof Error && error.message === "Ticket not found") {
        return { status: 404, message: error.message };
      }
      return null;
    },
    unexpectedErrorMessage: "Failed to queue workflow execution",
  }),
});
