import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { addInternalNote } from "@/features/tickets/services/internal-note-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const addInternalNoteSchema = z.object({
  body: z.string().trim().min(1).max(50_000),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "tickets:assign");
  if (!auth.ok) return;

  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket id" });
  }

  const result = addInternalNoteSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const note = await addInternalNote({
      organizationId: auth.user.organizationId,
      ticketId,
      body: result.data.body,
    });

    return res.status(201).json({ data: note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add note";
    return res.status(message === "Ticket not found" ? 404 : 500).json({ message });
  }
}
