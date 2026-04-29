import { prisma } from "@/lib/prisma";

export async function listEmailLogs(opts?: {
  status?: string;
  mailboxId?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
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
