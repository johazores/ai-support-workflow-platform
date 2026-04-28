import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { generateAiDraftReply } from "@/features/ai-drafts/services/ai-draft-service";

const generateDraftSchema = z.object({
  subject: z.string().min(1),
  customerName: z.string().min(1),
  customerMessage: z.string().min(1),
  tone: z
    .enum(["professional", "friendly", "concise", "empathetic"])
    .optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  const result = generateDraftSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const draft = await generateAiDraftReply(result.data);

    return res.status(200).json({
      data: draft,
    });
  } catch (error) {
    console.error("Failed to generate AI draft", error);

    return res.status(500).json({
      message: "Failed to generate AI draft",
    });
  }
}
