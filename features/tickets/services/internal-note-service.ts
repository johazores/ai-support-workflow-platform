import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { publishTicketEvent } from "@/features/tickets/services/ticket-event-bus";
import { prisma } from "@/lib/prisma";

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

  publishTicketEvent(ticket.id, "message-created", {
    messageId: message.id,
  });

  return message;
}
