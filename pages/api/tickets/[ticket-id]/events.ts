import type { NextApiRequest } from "next";
import { getTicketById } from "@/features/tickets/services/ticket-service";
import {
  publishTicketEvent,
  subscribeTicketEvents,
} from "@/features/tickets/services/ticket-event-bus";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

export const broadcastTicketUpdate = publishTicketEvent;

function ticketIdFrom(req: NextApiRequest) {
  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string" || !ticketId) {
    throw new TenantApiError(400, "Missing ticket-id");
  }
  return ticketId;
}

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "tickets:read",
    handle: async ({ req, res, user }) => {
      const ticketId = ticketIdFrom(req);
      const ticket = await getTicketById(ticketId, user.organizationId);
      if (!ticket) throw new TenantApiError(404, "Ticket not found");

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(": connected\n\n");

      const unsubscribe = subscribeTicketEvents(ticket.id, (event) => {
        res.write(
          `event: ${event.name}\ndata: ${JSON.stringify(event.data)}\n\n`,
        );
      });

      const heartbeat = setInterval(() => {
        res.write(": heartbeat\n\n");
      }, 30_000);

      req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    },
    unexpectedErrorMessage: "Failed to open ticket event stream",
  }),
});
