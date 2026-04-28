import { prisma } from "@/lib/prisma";

type SendManualReplyInput = {
  ticketId: string;
  body: string;
};

export async function sendManualReply(input: SendManualReplyInput) {
  const message = await prisma.message.create({
    data: {
      ticketId: input.ticketId,
      author: "support",
      body: input.body,
    },
  });

  await prisma.ticket.update({
    where: {
      id: input.ticketId,
    },
    data: {
      status: "pending",
    },
  });

  await prisma.activityLog.create({
    data: {
      ticketId: input.ticketId,
      type: "reply_sent",
      message: "Manual support reply sent.",
    },
  });

  return message;
}
