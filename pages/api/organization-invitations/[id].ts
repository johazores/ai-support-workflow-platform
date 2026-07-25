import type { NextApiRequest } from "next";
import { revokeOrganizationInvitation } from "@/features/organizations/services/organization-invitation-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

function invitationIdFrom(req: NextApiRequest) {
  const { id } = req.query;
  if (typeof id !== "string") {
    throw new TenantApiError(400, "Invalid invitation ID");
  }
  return id;
}

function mapInvitationError(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "Invitation not found") {
    return { status: 404, message: error.message };
  }
  if (error.message.startsWith("Clerk invitations are unavailable")) {
    return { status: 503, message: error.message };
  }
  return null;
}

export default createTenantApiRoute({
  DELETE: tenantApiRoute({
    permission: "users:manage",
    rateLimit: "sensitive",
    mapError: mapInvitationError,
    handle: async ({ req, res, user }) => {
      const invitation = await revokeOrganizationInvitation({
        organizationId: user.organizationId,
        invitationId: invitationIdFrom(req),
        actorUserId: user.id,
      });
      return res.status(200).json({ data: invitation });
    },
    unexpectedErrorMessage: "Failed to revoke invitation",
  }),
});
