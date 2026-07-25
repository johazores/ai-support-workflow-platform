import { getTickets } from "@/features/tickets/services/ticket-service";
import type { TicketStatus } from "@/features/tickets/types/ticket";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

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

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "tickets:read",
    handle: async ({ req, res, user }) => {
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
        organizationId: user.organizationId,
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
    },
    unexpectedErrorMessage: "Failed to fetch tickets",
  }),
});
