import type { NextApiRequest, NextApiResponse } from "next";
import { getAnalytics } from "@/features/analytics/services/analytics-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const days =
      typeof req.query.days === "string" ? parseInt(req.query.days, 10) : 30;

    const data = await getAnalytics(days);

    return res.status(200).json({ data });
  } catch (error) {
    console.error("Failed to fetch analytics", error);
    return res.status(500).json({ message: "Failed to fetch analytics" });
  }
}
