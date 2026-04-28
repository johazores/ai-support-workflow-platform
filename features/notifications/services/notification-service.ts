import { prisma } from "@/lib/prisma";

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  ticketId?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      ticketId: input.ticketId ?? null,
    },
  });
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Notify all admins about an event (e.g., new ticket from email).
 */
export async function notifyAdmins(
  input: Omit<CreateNotificationInput, "userId">,
) {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) => createNotification({ ...input, userId: admin.id })),
  );
}

/**
 * Notify the assigned agent on a ticket.
 */
export async function notifyAssignee(
  ticketId: string,
  input: Omit<CreateNotificationInput, "userId" | "ticketId">,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { assigneeEmail: true },
  });

  if (!ticket?.assigneeEmail) return;

  const user = await prisma.user.findUnique({
    where: { email: ticket.assigneeEmail },
    select: { id: true },
  });

  if (!user) return;

  await createNotification({
    ...input,
    userId: user.id,
    ticketId,
  });
}
