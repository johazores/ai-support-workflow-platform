import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/features/auth/services/session-service";
import {
  isElevatedRole,
  hasPermission,
} from "@/features/auth/services/role-service";
import {
  ensureLegacyOrganizationForUser,
  requireOrganizationMembership,
} from "@/features/organizations/services/organization-service";

export async function requireUser() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  const databaseUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });
  if (!databaseUser || databaseUser.status !== "active") redirect("/login");

  const organization = sessionUser.organizationId
    ? await requireOrganizationMembership(
        databaseUser.id,
        sessionUser.organizationId,
      )
    : await ensureLegacyOrganizationForUser(databaseUser);

  if (!organization) redirect("/login");

  return {
    id: databaseUser.id,
    name: databaseUser.name,
    email: databaseUser.email,
    role: organization.role,
    organizationId: organization.organizationId,
  };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/inbox");
  return user;
}

export async function requireSupervisor() {
  const user = await requireUser();
  if (!isElevatedRole(user.role)) redirect("/inbox");
  return user;
}

export async function requirePermission(
  permission: Parameters<typeof hasPermission>[1],
) {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) redirect("/inbox");
  return user;
}
