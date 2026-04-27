import type { NextApiRequest, NextApiResponse } from "next";
import { getTickets } from "@/features/tickets/services/ticket-service";
import type { TicketStatus } from "@/features/tickets/types/ticket";

const validStatuses: TicketStatus[] = ["open", "pending", "closed"];

function parseStatus(status: unknown): TicketStatus | undefined {
  if (typeof status !== "string") return undefined;

  return validStatuses.includes(status as TicketStatus)
    ? (status as TicketStatus)
    : undefined;
}

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
      status: parseStatus(status),
    });

    return res.status(200).json({ data: tickets });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch tickets",
    });
  }
}
