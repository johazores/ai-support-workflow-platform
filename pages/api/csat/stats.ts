import { getCsatStats } from "@/features/csat/services/csat-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
} from "@/lib/tenant-api-route";

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "analytics:read",
    handle: async ({ res, user }) => {
      const stats = await getCsatStats(user.organizationId);
      res.status(200).json({ data: stats });
    },
    unexpectedErrorMessage: "Failed to load CSAT statistics",
  }),
});
