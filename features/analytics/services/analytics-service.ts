import { prisma } from "@/lib/prisma";

export type TicketVolumePoint = {
  date: string;
  count: number;
};

export type StatusBreakdown = {
  status: string;
  count: number;
};

export type PriorityBreakdown = {
  priority: string;
  count: number;
};

export type AnalyticsData = {
  totalTickets: number;
  openTickets: number;
  avgResponseTimeMinutes: number | null;
  ticketVolume: TicketVolumePoint[];
  statusBreakdown: StatusBreakdown[];
  priorityBreakdown: PriorityBreakdown[];
};

export async function getAnalytics(days = 30): Promise<AnalyticsData> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalTickets, openTickets, tickets, allTickets] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "open" } }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.ticket.findMany({
      select: { status: true, priority: true },
    }),
  ]);

  // Build daily volume for the period
  const volumeMap = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    volumeMap.set(d.toISOString().slice(0, 10), 0);
  }

  for (const ticket of tickets) {
    const key = ticket.createdAt.toISOString().slice(0, 10);

    if (volumeMap.has(key)) {
      volumeMap.set(key, (volumeMap.get(key) ?? 0) + 1);
    }
  }

  const ticketVolume: TicketVolumePoint[] = Array.from(volumeMap.entries()).map(
    ([date, count]) => ({ date, count }),
  );

  // Status breakdown
  const statusCounts = new Map<string, number>();

  for (const t of allTickets) {
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
  }

  const statusBreakdown: StatusBreakdown[] = Array.from(
    statusCounts.entries(),
  ).map(([status, count]) => ({ status, count }));

  // Priority breakdown
  const priorityCounts = new Map<string, number>();

  for (const t of allTickets) {
    priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
  }

  const priorityBreakdown: PriorityBreakdown[] = Array.from(
    priorityCounts.entries(),
  ).map(([priority, count]) => ({ priority, count }));

  // Average first response time (time from ticket creation to first non-customer message)
  const ticketsWithMessages = await prisma.ticket.findMany({
    where: {
      messages: {
        some: { author: { not: "customer" } },
      },
    },
    select: {
      createdAt: true,
      messages: {
        where: { author: { not: "customer" } },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    take: 100,
  });

  let avgResponseTimeMinutes: number | null = null;

  if (ticketsWithMessages.length > 0) {
    const totalMinutes = ticketsWithMessages.reduce((sum, t) => {
      const firstResponse = t.messages[0]?.createdAt;

      if (!firstResponse) return sum;

      const diff = (firstResponse.getTime() - t.createdAt.getTime()) / 60_000;

      return sum + diff;
    }, 0);

    avgResponseTimeMinutes = Math.round(
      totalMinutes / ticketsWithMessages.length,
    );
  }

  return {
    totalTickets,
    openTickets,
    avgResponseTimeMinutes,
    ticketVolume,
    statusBreakdown,
    priorityBreakdown,
  };
}
