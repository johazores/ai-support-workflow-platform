import type { NextApiRequest, NextApiResponse } from "next";
import { sendDraft } from "@/features/ai-drafts/services/send-draft-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "tickets:write");
  if (!auth.ok) return;

  const draftId = req.query["draft-id"];
  if (typeof draftId !== "string") {
    return res.status(400).json({ message: "Invalid draft id" });
  }

  try {
    const message = await sendDraft({
      organizationId: auth.user.organizationId,
      draftId,
    });
    return res.status(200).json({ data: message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send draft";
    return res.status(message === "Draft not found" ? 404 : 502).json({ message });
  }
}
