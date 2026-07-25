import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listEmailLogs(
  organizationId: string,
  opts?: {
    status?: string;
    mailboxId?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.EmailLogWhereInput = { organizationId };
  if (opts?.status) where.status = opts.status;
  if (opts?.mailboxId) where.mailboxId = opts.mailboxId;

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return { logs, total };
}
