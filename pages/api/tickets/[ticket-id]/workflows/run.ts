import type { NextApiRequest } from "next";
import { executeWorkflowRules } from "@/features/workflows/services/workflow-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

function ticketIdFrom(req: NextApiRequest) {
  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    throw new TenantApiError(400, "Invalid ticket id");
  }
  return ticketId;
}

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "tickets:assign",
    rateLimit: "sensitive",
    handle: async ({ req, res, user }) => {
      const result = await executeWorkflowRules(ticketIdFrom(req), {
        organizationId: user.organizationId,
        triggerType: "manual",
      });

      if (result.message === "Ticket not found.") {
        throw new TenantApiError(404, result.message);
      }

      return res.status(200).json({ data: result });
    },
    unexpectedErrorMessage: "Failed to execute workflows",
  }),
});
