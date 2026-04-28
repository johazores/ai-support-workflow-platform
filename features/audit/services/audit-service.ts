import { prisma } from "@/lib/prisma";

type AuditLogEntry = {
  id: string;
  ticketId: string;
  ticketSubject: string;
  type: string;
  message: string;
  createdAt: string;
};

type PaginatedAuditLogs = {
  logs: AuditLogEntry[];
  nextCursor: string | null;
  total: number;
};

const PAGE_SIZE = 25;

export async function getAuditLogs(params?: {
  cursor?: string;
  type?: string;
  ticketId?: string;
}): Promise<PaginatedAuditLogs> {
  const where: Record<string, unknown> = {};

  if (params?.type) {
    where.type = params.type;
  }

  if (params?.ticketId) {
    where.ticketId = params.ticketId;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      include: {
        ticket: { select: { subject: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  const hasMore = logs.length > PAGE_SIZE;
  const page = hasMore ? logs.slice(0, PAGE_SIZE) : logs;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return {
    logs: page.map((log) => ({
      id: log.id,
      ticketId: log.ticketId,
      ticketSubject: log.ticket.subject,
      type: log.type,
      message: log.message,
      createdAt: log.createdAt.toISOString(),
    })),
    nextCursor,
    total,
  };
}

export async function getAuditLogTypes(): Promise<string[]> {
  const logs = await prisma.activityLog.findMany({
    distinct: ["type"],
    select: { type: true },
  });

  return logs.map((l) => l.type);
}
