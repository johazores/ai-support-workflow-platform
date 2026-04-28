import { prisma } from "@/lib/prisma";

export async function listEmailLogs(opts?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const where = opts?.status ? { status: opts.status } : {};

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
