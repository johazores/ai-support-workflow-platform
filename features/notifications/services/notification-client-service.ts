import { apiClient } from "@/lib/api-client";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  ticketId: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  data: Notification[];
  unreadCount: number;
};

export async function fetchNotifications(): Promise<NotificationsResponse> {
  return apiClient<NotificationsResponse>("/api/notifications");
}

export async function markAllRead(): Promise<void> {
  await apiClient("/api/notifications", { method: "PATCH" });
}
