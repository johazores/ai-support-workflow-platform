import { prisma } from "@/lib/prisma";
import { getEmailProvider } from "@/lib/email-client";

type SendTicketEmailInput = {
  ticketId: string;
  messageId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
};

export async function sendTicketEmail(input: SendTicketEmailInput) {
  const provider = getEmailProvider();

  try {
    const result = await provider.send({
      to: input.to,
      subject: input.subject,
      body: input.body,
      inReplyTo: input.inReplyTo,
    });

    // Store the external message ID on the message for threading
    await prisma.message.update({
      where: { id: input.messageId },
      data: { externalMessageId: result.messageId },
    });

    await prisma.emailLog.create({
      data: {
        ticketId: input.ticketId,
        messageId: input.messageId,
        to: input.to,
        subject: input.subject,
        status: "sent",
      },
    });

    return { success: true, externalMessageId: result.messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.emailLog.create({
      data: {
        ticketId: input.ticketId,
        messageId: input.messageId,
        to: input.to,
        subject: input.subject,
        status: "failed",
        error: errorMessage,
      },
    });

    console.error("Failed to send email", error);

    return { success: false, error: errorMessage };
  }
}
