import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";

type SaveDraftInput = {
  organizationId: string;
  ticketId: string;
  body: string;
};

export async function saveDraft(input: SaveDraftInput) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: input.ticketId,
      ...((await isLegacyOrganization(input.organizationId))
        ? {
            OR: [
              { organizationId: input.organizationId },
              { organizationId: null },
            ],
          }
        : { organizationId: input.organizationId }),
    },
  });
  if (!ticket) throw new Error("Ticket not found");

  return prisma.draft.create({
    data: {
      organizationId: input.organizationId,
      ticketId: ticket.id,
      body: input.body,
    },
  });
}
