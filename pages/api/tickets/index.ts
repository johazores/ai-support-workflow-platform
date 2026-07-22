import type { NextApiRequest, NextApiResponse } from "next";
import { getTickets } from "@/features/tickets/services/ticket-service";
import type { TicketStatus } from "@/features/tickets/types/ticket";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const validStatuses: TicketStatus[] = [
  "open",
  "pending",
  "resolved",
  "closed",
];
const validPriorities = ["low", "normal", "high", "urgent"];

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
    const auth = await requireTenantApiPermission(req, res, "tickets:read");
    if (!auth.ok) return;

    const { search, status, priority, cursor, limit } = req.query;
    const searchValue =
      typeof search === "string" ? search.trim().slice(0, 200) : undefined;
    const priorityValue =
      typeof priority === "string" && validPriorities.includes(priority)
        ? priority
        : undefined;
    const requestedLimit =
      typeof limit === "string" ? Number.parseInt(limit, 10) : undefined;

    const result = await getTickets({
      organizationId: auth.user.organizationId,
      search: searchValue || undefined,
      status: parseStatus(status),
      priority: priorityValue,
      cursor: typeof cursor === "string" ? cursor : undefined,
      limit: Number.isFinite(requestedLimit) ? requestedLimit : undefined,
    });

    return res.status(200).json({
      data: result.tickets,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error("Failed to fetch tickets", error);
    return res.status(500).json({ message: "Failed to fetch tickets" });
  }
}
