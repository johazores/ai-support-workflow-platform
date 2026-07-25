import type { NextApiRequest } from "next";
import { z } from "zod";
import { addInternalNote } from "@/features/tickets/services/internal-note-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const addInternalNoteSchema = z.object({
  body: z.string().trim().min(1).max(50_000),
});

function ticketIdFrom(req: NextApiRequest) {
  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    throw new TenantApiError(400, "Invalid ticket id");
  }
  return ticketId;
}

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "tickets:assign",
    schema: addInternalNoteSchema,
    mapError: (error) =>
      error instanceof Error && error.message === "Ticket not found"
        ? { status: 404, message: error.message }
        : null,
    handle: async ({ req, res, user, input }) => {
      const note = await addInternalNote({
        organizationId: user.organizationId,
        ticketId: ticketIdFrom(req),
        body: input.body,
      });
      return res.status(201).json({ data: note });
    },
    unexpectedErrorMessage: "Failed to add note",
  }),
});
