import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import {
  hasPermission,
  type Permission,
} from "@/features/auth/services/role-service";
import {
  ensureLegacyOrganizationForUser,
  requireOrganizationMembership,
} from "@/features/organizations/services/organization-service";

type TenantAuthResult =
  | {
      ok: true;
      user: {
        id: string;
        name: string;
        email: string;
        role: string;
        organizationId: string;
      };
    }
  | { ok: false; user: null };

export async function requireTenantApiPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  permission: Permission,
): Promise<TenantAuthResult> {
  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return { ok: false, user: null };

  const databaseUser = await prisma.user.findUnique({
    where: { id: auth.user.id },
  });

  if (!databaseUser || databaseUser.status !== "active") {
    res.status(401).json({ message: "User account is unavailable" });
    return { ok: false, user: null };
  }

  const requestedOrganizationId =
    typeof req.headers["x-organization-id"] === "string"
      ? req.headers["x-organization-id"]
      : auth.user.organizationId;

  const organization = requestedOrganizationId
    ? await requireOrganizationMembership(
        databaseUser.id,
        requestedOrganizationId,
      )
    : await ensureLegacyOrganizationForUser(databaseUser);

  if (!organization) {
    res.status(403).json({ message: "Organization access denied" });
    return { ok: false, user: null };
  }

  if (!hasPermission(organization.role, permission)) {
    res.status(403).json({ message: "Forbidden" });
    return { ok: false, user: null };
  }

  return {
    ok: true,
    user: {
      id: databaseUser.id,
      name: databaseUser.name,
      email: databaseUser.email,
      role: organization.role,
      organizationId: organization.organizationId,
    },
  };
}
