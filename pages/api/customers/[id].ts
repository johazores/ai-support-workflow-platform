import type { NextApiRequest, NextApiResponse } from "next";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";
import { getCustomerWithTickets } from "@/features/customers/services/customer-service";

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

  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid customer ID" });
  }

  const customer = await getCustomerWithTickets(
    auth.user.organizationId,
    id,
  );

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  return res.status(200).json({ data: customer });
}
