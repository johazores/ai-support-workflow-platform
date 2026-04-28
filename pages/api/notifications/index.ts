import type { NextApiRequest, NextApiResponse } from "next";
import { parseSessionValue } from "@/features/auth/services/session-service";
import {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
} from "@/features/notifications/services/notification-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Parse session from cookie
  const sessionCookie = req.cookies["support_session"];
  const user = await parseSessionValue(sessionCookie);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "GET") {
    const [notifications, unreadCount] = await Promise.all([
      getNotifications(user.id),
      getUnreadCount(user.id),
    ]);

    return res.status(200).json({ data: notifications, unreadCount });
  }

  if (req.method === "PATCH") {
    await markNotificationsRead(user.id);

    return res.status(200).json({ message: "Marked all as read" });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).json({ message: "Method not allowed" });
}
