import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  updateSavedReply,
  deleteSavedReply,
} from "@/features/saved-replies/services/saved-reply-service";

const updateSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1),
  shortcut: z.string().max(30).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const id = req.query.id as string;

  if (!id) {
    return res.status(400).json({ message: "Missing id" });
  }

  if (req.method === "PUT") {
    const result = updateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: result.error.flatten(),
      });
    }

    try {
      const reply = await updateSavedReply({ id, ...result.data });
      return res.status(200).json({ data: reply });
    } catch (error) {
      console.error("Failed to update saved reply", error);
      return res.status(500).json({ message: "Failed to update saved reply" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await deleteSavedReply(id);
      return res.status(200).json({ message: "Deleted" });
    } catch (error) {
      console.error("Failed to delete saved reply", error);
      return res.status(500).json({ message: "Failed to delete saved reply" });
    }
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
