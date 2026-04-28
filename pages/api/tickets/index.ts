import type { NextApiRequest, NextApiResponse } from "next";
import { getTickets } from "@/features/tickets/services/ticket-service";
import type { TicketStatus } from "@/features/tickets/types/ticket";
import { requireApiAuth } from "@/lib/api-auth";

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
    const auth = await requireApiAuth(req, res);
    if (!auth.ok) return;

    const { search, status, cursor, limit } = req.query;

    const result = await getTickets({
      search: typeof search === "string" ? search : undefined,
      status: parseStatus(status),
      cursor: typeof cursor === "string" ? cursor : undefined,
      limit: typeof limit === "string" ? parseInt(limit, 10) : undefined,
    });

    return res.status(200).json({
      data: result.tickets,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch tickets",
    });
  }
}
