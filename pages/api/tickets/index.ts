import type { NextApiRequest, NextApiResponse } from "next";
import { getTickets } from "@/features/tickets/services/ticket-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { search, status } = req.query;

    const tickets = await getTickets({
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? (status as any) : undefined,
    });

    return res.status(200).json({ data: tickets });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch tickets",
    });
  }
}
