import { z } from "zod";
import { isLegacyProductAuthEnabled } from "@/features/auth/services/legacy-auth-config";
import {
  createUser,
  listUsers,
} from "@/features/auth/services/user-management-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "supervisor", "agent"]),
});

function mapCreateUserError(error: unknown) {
  if (!(error instanceof Error)) return null;

  if (error.message === "User already belongs to organization") {
    return { status: 409, message: error.message };
  }
  if (error.message === "User account is inactive") {
    return { status: 400, message: error.message };
  }
  if (error.message.includes("Unique constraint")) {
    return { status: 409, message: "Email already in use" };
  }

  return null;
}

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "users:manage",
    handle: async ({ res, user }) => {
      const users = await listUsers(user.organizationId);
      return res.status(200).json({ data: users });
    },
    unexpectedErrorMessage: "Failed to list users",
  }),
  POST: tenantApiRoute({
    permission: "users:manage",
    schema: createUserSchema,
    rateLimit: "sensitive",
    mapError: mapCreateUserError,
    handle: async ({ res, user, input }) => {
      if (!isLegacyProductAuthEnabled()) {
        throw new TenantApiError(
          410,
          "Direct password-based user creation is disabled. Use organization invitations.",
        );
      }

      const createdUser = await createUser({
        organizationId: user.organizationId,
        actorUserId: user.id,
        ...input,
      });
      return res.status(201).json({ data: createdUser });
    },
    unexpectedErrorMessage: "Failed to add user",
  }),
});
