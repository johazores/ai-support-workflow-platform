import { listCustomers } from "@/features/customers/services/customer-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "tickets:read",
    handle: async ({ res, user }) => {
      const customers = await listCustomers(user.organizationId);
      return res.status(200).json({ data: customers });
    },
    unexpectedErrorMessage: "Failed to load customers",
  }),
});
