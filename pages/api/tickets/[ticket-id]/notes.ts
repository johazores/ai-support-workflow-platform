import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { addInternalNote } from "@/features/tickets/services/internal-note-service";
import { requireApiAuth } from "@/lib/api-auth";

const addInternalNoteSchema = z.object({
  body: z.string().min(1),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiAuth(req, res);
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
      ticketId,
      body: result.data.body,
    });

    return res.status(201).json({ data: note });
  } catch (error) {
    console.error("Failed to add internal note", error);

    return res.status(500).json({
      message: "Failed to add internal note",
    });
  }
}
