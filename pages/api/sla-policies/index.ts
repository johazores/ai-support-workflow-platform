import { getAllSlaPolicies } from "@/features/sla/services/sla-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "workflows:manage",
    handle: async ({ res, user }) => {
      const policies = await getAllSlaPolicies(user.organizationId);
      return res.status(200).json({ data: policies });
    },
    unexpectedErrorMessage: "Failed to load SLA policies",
  }),
});
