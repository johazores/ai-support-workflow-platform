import type { NextApiRequest, NextApiResponse } from "next";
import {
  pollAllInboxes,
  pollInboxById,
} from "@/features/email/services/imap-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(
    req,
    res,
    "email-settings:manage",
  );
  if (!auth.ok) return;

  try {
    const mailboxId =
      typeof req.body?.mailboxId === "string" ? req.body.mailboxId : undefined;

    if (mailboxId) {
      const result = await pollInboxById(auth.user.organizationId, mailboxId);
      return res.status(200).json({ data: result });
    }

    const results = await pollAllInboxes(auth.user.organizationId);
    return res.status(200).json({ data: results });
  } catch (err) {
    console.error("IMAP poll failed:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to poll inbox",
    });
  }
}
