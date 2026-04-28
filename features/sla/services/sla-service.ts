import { prisma } from "@/lib/prisma";

export type SlaStatus = {
  firstResponseDue: string | null;
  resolutionDue: string | null;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
};

export async function getSlaStatus(
  ticketId: string,
): Promise<SlaStatus | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) return null;

  const policy = await prisma.slaPolicy.findUnique({
    where: { priority: ticket.priority },
  });

  if (!policy) return null;

  const createdAt = ticket.createdAt.getTime();
  const now = Date.now();

  const firstResponseDue = new Date(
    createdAt + policy.firstResponseMinutes * 60_000,
  );
  const resolutionDue = new Date(createdAt + policy.resolutionMinutes * 60_000);

  // First response = first non-customer message
  const hasResponse = ticket.messages.some((m) => m.author !== "customer");

  const isClosed = ticket.status === "closed";

  return {
    firstResponseDue: hasResponse ? null : firstResponseDue.toISOString(),
    resolutionDue: isClosed ? null : resolutionDue.toISOString(),
    firstResponseBreached: !hasResponse && now > firstResponseDue.getTime(),
    resolutionBreached: !isClosed && now > resolutionDue.getTime(),
  };
}

export async function getAllSlaPolicies() {
  return prisma.slaPolicy.findMany({
    orderBy: { firstResponseMinutes: "asc" },
  });
}

export async function seedSlaPolicies() {
  const defaults = [
    {
      name: "Urgent",
      priority: "urgent",
      firstResponseMinutes: 30,
      resolutionMinutes: 240,
    },
    {
      name: "High",
      priority: "high",
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
    },
    {
      name: "Normal",
      priority: "normal",
      firstResponseMinutes: 240,
      resolutionMinutes: 1440,
    },
    {
      name: "Low",
      priority: "low",
      firstResponseMinutes: 480,
      resolutionMinutes: 2880,
    },
  ];

  for (const policy of defaults) {
    await prisma.slaPolicy.upsert({
      where: { priority: policy.priority },
      update: {},
      create: policy,
    });
  }
}
