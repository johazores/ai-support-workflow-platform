import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isClerkConfigured } from "@/features/auth/services/clerk-config";
import { getClerkAppSessionUser } from "@/features/auth/services/clerk-session-service";
import { getCurrentUser } from "@/features/auth/services/session-service";
import {
  isElevatedRole,
  hasPermission,
} from "@/features/auth/services/role-service";
import {
  ensureLegacyOrganizationForUser,
  requireOrganizationMembership,
} from "@/features/organizations/services/organization-service";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  authProvider: "clerk" | "legacy";
};

export async function requireUser(): Promise<AuthenticatedUser> {
  const clerkUser = await getClerkAppSessionUser();
  if (clerkUser) {
    if (!clerkUser.organizationId) redirect("/onboarding");

    return {
      id: clerkUser.id,
      name: clerkUser.name,
      email: clerkUser.email,
      role: clerkUser.role,
      organizationId: clerkUser.organizationId,
      authProvider: "clerk",
    };
  }

  const sessionUser = await getCurrentUser();
  const signInPath = isClerkConfigured() ? "/sign-in" : "/login";
  if (!sessionUser) redirect(signInPath);

  const databaseUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });
  if (!databaseUser || databaseUser.status !== "active") redirect(signInPath);

  const organization = sessionUser.organizationId
    ? await requireOrganizationMembership(
        databaseUser.id,
        sessionUser.organizationId,
      )
    : await ensureLegacyOrganizationForUser(databaseUser);

  if (!organization) redirect(signInPath);

  return {
    id: databaseUser.id,
    name: databaseUser.name,
    email: databaseUser.email,
    role: organization.role,
    organizationId: organization.organizationId,
    authProvider: "legacy",
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
