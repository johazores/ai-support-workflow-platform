import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/features/auth/services/password-service";
import { ensureLegacyOrganizationForUser } from "@/features/organizations/services/organization-service";

type LoginInput = {
  email: string;
  password: string;
};

export async function validateUserLogin(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email.toLowerCase().trim(),
    },
  });

  if (!user || user.status !== "active") return null;

  const isValidPassword = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!isValidPassword) return null;

  const organization = await ensureLegacyOrganizationForUser(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: organization.role,
    organizationId: organization.organizationId,
  };
}
