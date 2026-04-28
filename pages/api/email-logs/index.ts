import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiPermission } from "@/lib/api-auth";
import { listEmailLogs } from "@/features/email-logs/services/email-log-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "email-logs:read");
  if (!auth.ok) return;

  if (req.method === "GET") {
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const result = await listEmailLogs({ status, limit, offset });
    return res.status(200).json({ data: result });
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ message: "Method not allowed" });
}
