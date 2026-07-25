import type { NextApiRequest } from "next";
import { getCustomerWithTickets } from "@/features/customers/services/customer-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

function customerIdFrom(req: NextApiRequest) {
  const id = req.query.id;
  if (typeof id !== "string") {
    throw new TenantApiError(400, "Invalid customer ID");
  }
  return id;
}

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "tickets:read",
    handle: async ({ req, res, user }) => {
      const customer = await getCustomerWithTickets(
        user.organizationId,
        customerIdFrom(req),
      );
      if (!customer) throw new TenantApiError(404, "Customer not found");
      return res.status(200).json({ data: customer });
    },
    unexpectedErrorMessage: "Failed to load customer",
  }),
});
