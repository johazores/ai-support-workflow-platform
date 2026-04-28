import type { NextApiRequest, NextApiResponse } from "next";
import { getAnalytics } from "@/features/analytics/services/analytics-service";
import { requireApiPermission } from "@/lib/api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiPermission(req, res, "analytics:read");
  if (!auth.ok) return;

  try {
    const daysParam = req.query.days;
    const days =
      typeof daysParam === "string"
        ? Math.min(Math.max(parseInt(daysParam, 10) || 30, 1), 365)
        : 30;

    const data = await getAnalytics(days);

    return res.status(200).json({ data });
  } catch (error) {
    console.error("Failed to fetch analytics", error);
    return res.status(500).json({ message: "Failed to fetch analytics" });
  }
}
