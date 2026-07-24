import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
  notifyAdmins,
  notifyAssignee,
} from "@/features/notifications/services/notification-service";

const prismaMocks = vi.hoisted(() => ({
  notificationCreate: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCount: vi.fn(),
  notificationUpdateMany: vi.fn(),
  organizationMemberFindMany: vi.fn(),
  organizationMemberFindUnique: vi.fn(),
  ticketFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      create: prismaMocks.notificationCreate,
      findMany: prismaMocks.notificationFindMany,
      count: prismaMocks.notificationCount,
      updateMany: prismaMocks.notificationUpdateMany,
    },
    organizationMember: {
      findMany: prismaMocks.organizationMemberFindMany,
      findUnique: prismaMocks.organizationMemberFindUnique,
    },
    ticket: {
      findFirst: prismaMocks.ticketFindFirst,
    },
    user: {
      findUnique: prismaMocks.userFindUnique,
    },
  },
}));

describe("notification-service tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
    prismaMocks.notificationFindMany.mockResolvedValue([]);
    prismaMocks.notificationCount.mockResolvedValue(0);
    prismaMocks.notificationUpdateMany.mockResolvedValue({ count: 0 });
    prismaMocks.organizationMemberFindMany.mockResolvedValue([]);
    prismaMocks.organizationMemberFindUnique.mockResolvedValue(null);
    prismaMocks.ticketFindFirst.mockResolvedValue(null);
    prismaMocks.userFindUnique.mockResolvedValue(null);
  });

  it("writes the organization on new notifications", async () => {
    await createNotification({
      organizationId: "org-1",
      userId: "user-1",
      type: "new-ticket",
      title: "New ticket",
      message: "A ticket was created",
      ticketId: "ticket-1",
    });

    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        ticketId: "ticket-1",
      }),
    });
  });

  it("scopes notification reads and mark-read updates by organization and user", async () => {
    await getNotifications("org-1", "user-1");
    await getUnreadCount("org-1", "user-1");
    await markNotificationsRead("org-1", "user-1");

    expect(prismaMocks.notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", userId: "user-1" },
      }),
    );
    expect(prismaMocks.notificationCount).toHaveBeenCalledWith({
      where: { organizationId: "org-1", userId: "user-1", isRead: false },
    });
    expect(prismaMocks.notificationUpdateMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", userId: "user-1", isRead: false },
      data: { isRead: true },
    });
  });

  it("notifies only active administrators in the requested organization", async () => {
    prismaMocks.organizationMemberFindMany.mockResolvedValue([
      { userId: "admin-1" },
      { userId: "admin-2" },
    ]);

    await notifyAdmins("org-1", {
      type: "new-ticket",
      title: "New ticket",
      message: "A ticket was created",
      ticketId: "ticket-1",
    });

    expect(prismaMocks.organizationMemberFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", role: "admin", status: "active" },
      select: { userId: true },
    });
    expect(prismaMocks.notificationCreate).toHaveBeenCalledTimes(2);
    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        userId: "admin-1",
      }),
    });
  });

  it("does not notify an assignee without an active organization membership", async () => {
    prismaMocks.ticketFindFirst.mockResolvedValue({
      assigneeEmail: "agent@example.com",
    });
    prismaMocks.userFindUnique.mockResolvedValue({ id: "agent-1" });
    prismaMocks.organizationMemberFindUnique.mockResolvedValue({
      status: "suspended",
    });

    await notifyAssignee("org-1", "ticket-1", {
      type: "customer-reply",
      title: "Reply",
      message: "Customer replied",
    });

    expect(prismaMocks.notificationCreate).not.toHaveBeenCalled();
  });
});
