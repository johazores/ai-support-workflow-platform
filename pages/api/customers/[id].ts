import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiAuth } from "@/lib/api-auth";
import { getCustomerWithTickets } from "@/features/customers/services/customer-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid customer ID" });
  }

  if (req.method === "GET") {
    const customer = await getCustomerWithTickets(id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ data: customer });
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ message: "Method not allowed" });
}
