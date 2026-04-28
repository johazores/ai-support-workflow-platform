import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiPermission } from "@/lib/api-auth";
import { getAllSlaPolicies } from "@/features/sla/services/sla-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "workflows:manage");
  if (!auth.ok) return;

  if (req.method === "GET") {
    const policies = await getAllSlaPolicies();
    return res.status(200).json({ data: policies });
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ message: "Method not allowed" });
}
