import type { Prisma } from "@prisma/client";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
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

async function ticketTenantWhere(
  organizationId: string,
): Promise<Prisma.TicketWhereInput> {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

export async function getAnalytics(
  organizationId: string,
  days = 30,
): Promise<AnalyticsData> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const tenantWhere = await ticketTenantWhere(organizationId);

  const [totalTickets, openTickets, tickets, allTickets] = await Promise.all([
    prisma.ticket.count({ where: tenantWhere }),
    prisma.ticket.count({ where: { ...tenantWhere, status: "open" } }),
    prisma.ticket.findMany({
      where: { ...tenantWhere, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.ticket.findMany({
      where: tenantWhere,
      select: { status: true, priority: true },
    }),
  ]);

  const volumeMap = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    volumeMap.set(date.toISOString().slice(0, 10), 0);
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

  const statusCounts = new Map<string, number>();

  for (const ticket of allTickets) {
    statusCounts.set(
      ticket.status,
      (statusCounts.get(ticket.status) ?? 0) + 1,
    );
  }

  const statusBreakdown: StatusBreakdown[] = Array.from(
    statusCounts.entries(),
  ).map(([status, count]) => ({ status, count }));

  const priorityCounts = new Map<string, number>();

  for (const ticket of allTickets) {
    priorityCounts.set(
      ticket.priority,
      (priorityCounts.get(ticket.priority) ?? 0) + 1,
    );
  }

  const priorityBreakdown: PriorityBreakdown[] = Array.from(
    priorityCounts.entries(),
  ).map(([priority, count]) => ({ priority, count }));

  const ticketsWithMessages = await prisma.ticket.findMany({
    where: {
      ...tenantWhere,
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
    const totalMinutes = ticketsWithMessages.reduce((sum, ticket) => {
      const firstResponse = ticket.messages[0]?.createdAt;

      if (!firstResponse) return sum;

      const diff =
        (firstResponse.getTime() - ticket.createdAt.getTime()) / 60_000;

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
