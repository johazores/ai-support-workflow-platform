import { z } from "zod";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { createWorkflowRule } from "@/features/workflows/services/workflow-mutation-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

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

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "workflows:manage",
    schema: createWorkflowSchema,
    rateLimit: "sensitive",
    handle: async ({ res, user, input }) => {
      const workflow = await createWorkflowRule({
        organizationId: user.organizationId,
        name: input.name,
        description: input.description,
        trigger: JSON.stringify(input.trigger),
        actions: input.actions,
      });

      await recordAuditEvent({
        actorType: "user",
        userId: user.id,
        organizationId: user.organizationId,
        action: "workflow.created",
        targetType: "WorkflowRule",
        targetId: workflow.id,
        metadata: { name: workflow.name },
      });

      return res.status(201).json({ data: workflow });
    },
    unexpectedErrorMessage: "Failed to create workflow",
  }),
});
