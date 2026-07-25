import type { NextApiRequest, NextApiResponse } from "next";
import {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
} from "@/features/notifications/services/notification-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireTenantApiPermission(req, res, "tickets:read");
  if (!auth.ok) return;

  const { id: userId, organizationId } = auth.user;

  if (req.method === "GET") {
    const [notifications, unreadCount] = await Promise.all([
      getNotifications(organizationId, userId),
      getUnreadCount(organizationId, userId),
    ]);

    return res.status(200).json({ data: notifications, unreadCount });
  }

  if (req.method === "PATCH") {
    await markNotificationsRead(organizationId, userId);

    return res.status(200).json({ message: "Marked all as read" });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).json({ message: "Method not allowed" });
}
