import { prisma } from "@/lib/prisma";

function tenantFilter(organizationId: string) {
  return { OR: [{ organizationId }, { organizationId: null }] };
}

export async function listCustomers(organizationId: string) {
  const customers = await prisma.customer.findMany({
    where: tenantFilter(organizationId),
    include: {
      _count: {
        select: {
          tickets: {
            where: tenantFilter(organizationId),
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    ticketCount: customer._count.tickets,
    createdAt: customer.createdAt,
  }));
}

export async function getCustomerWithTickets(
  organizationId: string,
  id: string,
) {
  return prisma.customer.findFirst({
    where: { id, ...tenantFilter(organizationId) },
    include: {
      tickets: {
        where: tenantFilter(organizationId),
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
