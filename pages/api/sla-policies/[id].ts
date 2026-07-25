import type { NextApiRequest } from "next";
import { z } from "zod";
import { updateSlaPolicy } from "@/features/sla/services/sla-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const updateSchema = z.object({
  firstResponseMinutes: z.number().int().min(1).max(525_600),
  resolutionMinutes: z.number().int().min(1).max(525_600),
});

function policyIdFrom(req: NextApiRequest) {
  const { id } = req.query;
  if (typeof id !== "string") {
    throw new TenantApiError(400, "Invalid policy ID");
  }
  return id;
}

export default createTenantApiRoute({
  PATCH: tenantApiRoute({
    permission: "workflows:manage",
    schema: updateSchema,
    rateLimit: "sensitive",
    mapError: (error) =>
      error instanceof Error && error.message === "Policy not found"
        ? { status: 404, message: error.message }
        : null,
    handle: async ({ req, res, user, input }) => {
      if (input.resolutionMinutes < input.firstResponseMinutes) {
        throw new TenantApiError(
          400,
          "Resolution time must be greater than first response time",
        );
      }

      const policy = await updateSlaPolicy({
        organizationId: user.organizationId,
        actorUserId: user.id,
        id: policyIdFrom(req),
        data: input,
      });
      return res.status(200).json({ data: policy });
    },
    unexpectedErrorMessage: "Failed to update SLA policy",
  }),
});
