import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/features/auth/services/password-service";

type LoginInput = {
  email: string;
  password: string;
};

export async function validateUserLogin(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) return null;

  const isValidPassword = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!isValidPassword) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
