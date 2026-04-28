import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  getAllSavedReplies,
  createSavedReply,
} from "@/features/saved-replies/services/saved-reply-service";
import { requireApiAuth } from "@/lib/api-auth";

const createSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1),
  shortcut: z.string().max(30).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  if (req.method === "GET") {
    const replies = await getAllSavedReplies();
    return res.status(200).json({ data: replies });
  }

  if (req.method === "POST") {
    const result = createSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    try {
      const reply = await createSavedReply(result.data);
      return res.status(201).json({ data: reply });
    } catch (error) {
      console.error("Failed to create saved reply", error);
      return res.status(500).json({ message: "Failed to create saved reply" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
