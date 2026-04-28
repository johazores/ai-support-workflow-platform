import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { setTicketTags } from "@/features/tags/services/tag-service";
import { requireApiAuth } from "@/lib/api-auth";

const setTagsSchema = z.object({
  tagIds: z.array(z.string().min(1)),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  const ticketId = req.query["ticket-id"] as string;

  if (!ticketId) {
    return res.status(400).json({ message: "Missing ticket-id" });
  }

  const result = setTagsSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    await setTicketTags(ticketId, result.data.tagIds);
    return res.status(200).json({ message: "Tags updated" });
  } catch (error) {
    console.error("Failed to update tags", error);
    return res.status(500).json({ message: "Failed to update tags" });
  }
}
