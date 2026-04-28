import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/features/auth/services/password-service";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

export async function listUsers(): Promise<UserSummary[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string): Promise<UserSummary | null> {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<UserSummary> {
  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function updateUserRole(
  id: string,
  role: string,
): Promise<UserSummary> {
  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}
