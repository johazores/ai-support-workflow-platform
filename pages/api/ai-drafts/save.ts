import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { saveDraft } from "@/features/ai-drafts/services/draft-service";

const saveDraftSchema = z.object({
  ticketId: z.string().min(1),
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

  const result = saveDraftSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  const draft = await saveDraft(result.data);

  return res.status(201).json({ data: draft });
}
