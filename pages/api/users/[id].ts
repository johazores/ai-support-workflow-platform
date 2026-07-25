import type { NextApiRequest } from "next";
import { z } from "zod";
import {
  getUserById,
  removeUserFromOrganization,
  updateUserRole,
} from "@/features/auth/services/user-management-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "supervisor", "agent"]),
});

function userIdFrom(req: NextApiRequest) {
  const { id } = req.query;
  if (typeof id !== "string") {
    throw new TenantApiError(400, "Invalid user ID");
  }
  return id;
}

function mapUserMutationError(error: unknown) {
  if (!(error instanceof Error)) return null;

  if (error.message === "User not found") {
    return { status: 404, message: error.message };
  }
  if (error.message === "Organization must keep at least one active admin") {
    return { status: 409, message: error.message };
  }

  return null;
}

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "users:manage",
    handle: async ({ req, res, user }) => {
      const id = userIdFrom(req);
      const targetUser = await getUserById(user.organizationId, id);
      if (!targetUser) throw new TenantApiError(404, "User not found");
      return res.status(200).json({ data: targetUser });
    },
    unexpectedErrorMessage: "Failed to load user",
  }),
  PATCH: tenantApiRoute({
    permission: "users:manage",
    schema: updateRoleSchema,
    rateLimit: "sensitive",
    mapError: mapUserMutationError,
    handle: async ({ req, res, user, input }) => {
      const id = userIdFrom(req);
      if (id === user.id) {
        throw new TenantApiError(400, "Cannot change your own role");
      }

      const updatedUser = await updateUserRole({
        organizationId: user.organizationId,
        actorUserId: user.id,
        id,
        role: input.role,
      });
      return res.status(200).json({ data: updatedUser });
    },
    unexpectedErrorMessage: "Failed to update user",
  }),
  DELETE: tenantApiRoute({
    permission: "users:manage",
    rateLimit: "sensitive",
    mapError: mapUserMutationError,
    handle: async ({ req, res, user }) => {
      const id = userIdFrom(req);
      if (id === user.id) {
        throw new TenantApiError(400, "Cannot remove your own account");
      }

      await removeUserFromOrganization({
        organizationId: user.organizationId,
        actorUserId: user.id,
        id,
      });
      return res.status(204).end();
    },
    unexpectedErrorMessage: "Failed to remove user",
  }),
});
