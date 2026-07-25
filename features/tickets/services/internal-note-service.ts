import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { prisma } from "@/lib/prisma";
import { broadcastTicketUpdate } from "@/pages/api/tickets/[ticket-id]/events";

type AddInternalNoteInput = {
  organizationId: string;
  ticketId: string;
  body: string;
};

export async function addInternalNote(input: AddInternalNoteInput) {
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

  const message = await prisma.message.create({
    data: {
      organizationId: input.organizationId,
      ticketId: ticket.id,
      author: "note",
      body: input.body,
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      ticketId: ticket.id,
      type: "internal_note_added",
      message: "Internal note added.",
    },
  });

  broadcastTicketUpdate(ticket.id, "message-created", {
    messageId: message.id,
  });

  return message;
}
