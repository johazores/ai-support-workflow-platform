import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiAuth } from "@/lib/api-auth";
import { listCustomers } from "@/features/customers/services/customer-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  if (req.method === "GET") {
    const customers = await listCustomers();
    return res.status(200).json({ data: customers });
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ message: "Method not allowed" });
}
