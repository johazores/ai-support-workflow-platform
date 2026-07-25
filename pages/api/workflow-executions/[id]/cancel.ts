import { z } from "zod";
import { requestWorkflowExecutionCancellation } from "@/features/workflows/services/versioned-workflow-runtime";
import {
  createTenantApiRoute,
  tenantApiRoute,
} from "@/lib/tenant-api-route";

const cancelSchema = z.object({
  executionId: z.string().trim().min(1).max(100),
});

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "workflows:manage",
    rateLimit: "sensitive",
    parse: (req) => ({ executionId: req.query.id }),
    schema: cancelSchema,
    async handle({ user, input, res }) {
      const execution = await requestWorkflowExecutionCancellation({
        organizationId: user.organizationId,
        executionId: input.executionId,
      });
      return res.status(200).json({ data: execution });
    },
    mapError(error) {
      if (
        error instanceof Error &&
        error.message === "Workflow execution not found"
      ) {
        return { status: 404, message: error.message };
      }
      return null;
    },
    unexpectedErrorMessage: "Failed to cancel workflow execution",
  }),
});
