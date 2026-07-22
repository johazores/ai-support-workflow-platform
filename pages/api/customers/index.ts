import type { NextApiRequest, NextApiResponse } from "next";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";
import { listCustomers } from "@/features/customers/services/customer-service";

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

  const customers = await listCustomers(auth.user.organizationId);
  return res.status(200).json({ data: customers });
}
