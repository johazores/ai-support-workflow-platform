import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { sendManualReply } from "@/features/tickets/services/reply-service";
import { requireApiAuth } from "@/lib/api-auth";

const sendReplySchema = z.object({
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

  const result = sendReplySchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const message = await sendManualReply({
      ticketId,
      body: result.data.body,
    });

    return res.status(201).json({ data: message });
  } catch (error) {
    console.error("Failed to send manual reply", error);

    return res.status(500).json({
      message: "Failed to send reply",
    });
  }
}
