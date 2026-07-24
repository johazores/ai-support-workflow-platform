import { prisma } from "@/lib/prisma";

type CreateNotificationInput = {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  ticketId?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      ticketId: input.ticketId ?? null,
    },
  });
}

export async function getNotifications(
  organizationId: string,
  userId: string,
) {
  return prisma.notification.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function getUnreadCount(
  organizationId: string,
  userId: string,
) {
  return prisma.notification.count({
    where: { organizationId, userId, isRead: false },
  });
}

export async function markNotificationsRead(
  organizationId: string,
  userId: string,
) {
  return prisma.notification.updateMany({
    where: { organizationId, userId, isRead: false },
    data: { isRead: true },
  });
}

/** Notify active administrators within one organization. */
export async function notifyAdmins(
  organizationId: string,
  input: Omit<CreateNotificationInput, "organizationId" | "userId">,
) {
  const admins = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      role: "admin",
      status: "active",
    },
    select: { userId: true },
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        ...input,
        organizationId,
        userId: admin.userId,
      }),
    ),
  );
}

/** Notify the assigned agent only when they belong to the ticket organization. */
export async function notifyAssignee(
  organizationId: string,
  ticketId: string,
  input: Omit<
    CreateNotificationInput,
    "organizationId" | "userId" | "ticketId"
  >,
) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
    select: { assigneeEmail: true },
  });

  if (!ticket?.assigneeEmail) return;

  const user = await prisma.user.findUnique({
    where: { email: ticket.assigneeEmail },
    select: { id: true },
  });

  if (!user) return;

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    select: { status: true },
  });

  if (membership?.status !== "active") return;

  await createNotification({
    ...input,
    organizationId,
    userId: user.id,
    ticketId,
  });
}
