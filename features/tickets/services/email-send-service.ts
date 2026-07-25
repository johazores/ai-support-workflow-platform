import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/features/email/services/smtp-service";

type SendTicketEmailInput = {
  organizationId: string;
  ticketId: string;
  messageId: string;
  to: string;
  subject: string;
  body: string;
  mailboxId?: string;
  inReplyTo?: string;
};

export async function sendTicketEmail(input: SendTicketEmailInput) {
  const message = await prisma.message.findFirst({
    where: {
      id: input.messageId,
      ticketId: input.ticketId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  });

  if (!message) {
    return { success: false, error: "Message not found in organization" };
  }

  try {
    const result = await sendEmail({
      organizationId: input.organizationId,
      to: input.to,
      subject: input.subject,
      text: input.body,
      ticketId: input.ticketId,
      messageId: input.messageId,
      mailboxId: input.mailboxId,
      inReplyTo: input.inReplyTo,
    });

    await prisma.message.update({
      where: { id: input.messageId },
      data: { externalMessageId: result.messageId },
    });

    return { success: true, externalMessageId: result.messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Failed to send email", error);

    return { success: false, error: errorMessage };
  }
}
