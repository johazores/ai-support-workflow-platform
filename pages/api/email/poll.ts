import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiPermission } from "@/lib/api-auth";
import { pollInbox } from "@/features/email/services/imap-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiPermission(req, res, "email-logs:read");
  if (!auth.ok) return;

  try {
    const result = await pollInbox();
    return res.status(200).json({ data: result });
  } catch (err) {
    console.error("IMAP poll failed:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to poll inbox",
    });
  }
}
