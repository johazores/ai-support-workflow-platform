import type { NextApiRequest, NextApiResponse } from "next";
import { getSlaStatus } from "@/features/sla/services/sla-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "tickets:read");
  if (!auth.ok) return;

  const ticketId = req.query["ticket-id"];
  if (typeof ticketId !== "string") {
    return res.status(400).json({ message: "Invalid ticket ID" });
  }

  const status = await getSlaStatus(auth.user.organizationId, ticketId);
  return res.status(200).json({ data: status });
}
