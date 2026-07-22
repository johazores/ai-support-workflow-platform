import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ROOT_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ROOT_ADMIN_PASSWORD;
  const displayName =
    process.env.ROOT_ADMIN_DISPLAY_NAME?.trim() || "Root Admin";

  if (!username) {
    throw new Error("ROOT_ADMIN_USERNAME is required");
  }

  if (!password || password.length < 12) {
    throw new Error("ROOT_ADMIN_PASSWORD must be at least 12 characters");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.rootAdmin.findUnique({ where: { username } });

  if (existing) {
    await prisma.rootAdmin.update({
      where: { id: existing.id },
      data: {
        displayName,
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        isActive: true,
      },
    });
    console.log(`Root administrator ${username} updated.`);
    return;
  }

  await prisma.rootAdmin.create({
    data: {
      username,
      displayName,
      passwordHash,
    },
  });

  console.log(`Root administrator ${username} created.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
