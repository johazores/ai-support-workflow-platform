import type { NextApiRequest, NextApiResponse } from "next";
import { getTicketSummaries } from "@/features/tickets/services/ticket-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  try {
    const tickets = await getTicketSummaries();

    return res.status(200).json({
      data: tickets,
    });
  } catch (error) {
    console.error("Failed to fetch tickets", error);

    return res.status(500).json({
      message: "Failed to fetch tickets",
    });
  }
}
