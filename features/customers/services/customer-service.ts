import { prisma } from "@/lib/prisma";

export async function listCustomers() {
  const customers = await prisma.customer.findMany({
    include: {
      _count: { select: { tickets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    ticketCount: c._count.tickets,
    createdAt: c.createdAt,
  }));
}

export async function getCustomerWithTickets(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      tickets: {
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}
