import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { updateTicketStatus } from "@/features/tickets/services/ticket-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const updateStatusSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]),
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

  const result = updateStatusSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const ticket = await updateTicketStatus(
      ticketId,
      result.data.status,
      auth.user.organizationId,
    );
    return res.status(200).json({ data: ticket });
  } catch (error) {
    console.error("Failed to update ticket status", error);
    return res.status(404).json({ message: "Ticket not found" });
  }
}
