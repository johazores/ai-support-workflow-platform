import type { NextApiRequest, NextApiResponse } from "next";
import { sendDraft } from "@/features/ai-drafts/services/send-draft-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const draftId = req.query["draft-id"];

  if (typeof draftId !== "string") {
    return res.status(400).json({ message: "Invalid draft id" });
  }

  try {
    const message = await sendDraft({ draftId });

    return res.status(200).json({ data: message });
  } catch (error) {
    console.error("Failed to send draft", error);

    return res.status(500).json({
      message: "Failed to send draft",
    });
  }
}
