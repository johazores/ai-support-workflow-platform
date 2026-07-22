import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { assignTicket } from "@/features/tickets/services/ticket-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const assignTicketSchema = z.object({
  assigneeName: z.string().trim().min(1).max(150),
  assigneeEmail: z.string().trim().email().max(255),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "tickets:assign");
  if (!auth.ok) return;

  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket id" });
  }

  const result = assignTicketSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const ticket = await assignTicket({
      organizationId: auth.user.organizationId,
      ticketId,
      assigneeName: result.data.assigneeName,
      assigneeEmail: result.data.assigneeEmail,
    });

    return res.status(200).json({ data: ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assignment failed";
    return res.status(message === "Ticket not found" ? 404 : 422).json({ message });
  }
}
