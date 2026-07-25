import { z } from "zod";
import {
  createOrganizationInvitation,
  listOrganizationInvitations,
} from "@/features/organizations/services/organization-invitation-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

const createInvitationSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["admin", "supervisor", "agent"]),
});

function mapInvitationError(error: unknown) {
  if (!(error instanceof Error)) return null;

  if (
    error.message === "User already belongs to organization" ||
    error.message === "Invitation already pending"
  ) {
    return { status: 409, message: error.message };
  }
  if (error.message === "Organization not found") {
    return { status: 404, message: error.message };
  }
  if (error.message === "User account is inactive") {
    return { status: 400, message: error.message };
  }
  if (error.message.startsWith("Clerk invitations are unavailable")) {
    return { status: 503, message: error.message };
  }

  return null;
}

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "users:manage",
    handle: async ({ res, user }) => {
      const invitations = await listOrganizationInvitations(user.organizationId);
      return res.status(200).json({ data: invitations });
    },
    unexpectedErrorMessage: "Failed to load organization invitations",
  }),
  POST: tenantApiRoute({
    permission: "users:manage",
    schema: createInvitationSchema,
    rateLimit: "sensitive",
    mapError: mapInvitationError,
    handle: async ({ res, user, input }) => {
      const result = await createOrganizationInvitation({
        organizationId: user.organizationId,
        invitedByUserId: user.id,
        email: input.email,
        role: input.role,
      });
      return res.status(201).json({ data: result });
    },
    unexpectedErrorMessage: "Failed to invite member",
  }),
});
