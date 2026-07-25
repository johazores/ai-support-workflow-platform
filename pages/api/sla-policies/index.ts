import type { NextApiRequest, NextApiResponse } from "next";
import { getAllSlaPolicies } from "@/features/sla/services/sla-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireTenantApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  const policies = await getAllSlaPolicies(auth.user.organizationId);
  return res.status(200).json({ data: policies });
}
