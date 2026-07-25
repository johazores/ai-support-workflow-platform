import type { Prisma } from "@prisma/client";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

async function tenantFilter(
  organizationId: string,
): Promise<Prisma.CustomerWhereInput> {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

async function ticketTenantFilter(
  organizationId: string,
): Promise<Prisma.TicketWhereInput> {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

export async function listCustomers(organizationId: string) {
  const customerWhere = await tenantFilter(organizationId);
  const ticketWhere = await ticketTenantFilter(organizationId);
  const customers = await prisma.customer.findMany({
    where: customerWhere,
    include: {
      _count: {
        select: {
          tickets: {
            where: ticketWhere,
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
  const customerWhere = await tenantFilter(organizationId);
  const ticketWhere = await ticketTenantFilter(organizationId);
  return prisma.customer.findFirst({
    where: { id, ...customerWhere },
    include: {
      tickets: {
        where: ticketWhere,
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
