import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { generateAiDraftReply } from "@/features/ai-drafts/services/ai-draft-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const generateDraftSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  customerName: z.string().trim().min(1).max(200),
  customerMessage: z.string().trim().min(1).max(50_000),
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
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "ai:generate");
  if (!auth.ok) return;

  const result = generateDraftSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: result.error.flatten(),
    });
  }

  try {
    const draft = await generateAiDraftReply({
      ...result.data,
      organizationId: auth.user.organizationId,
    });

    return res.status(200).json({ data: draft });
  } catch (error) {
    console.error("Failed to generate AI draft", error);
    return res.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : "No configured AI provider completed the request",
    });
  }
}
