import type { NextApiRequest } from "next";
import { getSlaStatus } from "@/features/sla/services/sla-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

function ticketIdFrom(req: NextApiRequest) {
  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    throw new TenantApiError(400, "Invalid ticket ID");
  }
  return ticketId;
}

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "tickets:read",
    handle: async ({ req, res, user }) => {
      const status = await getSlaStatus(
        user.organizationId,
        ticketIdFrom(req),
      );
      return res.status(200).json({ data: status });
    },
    unexpectedErrorMessage: "Failed to load SLA status",
  }),
});
