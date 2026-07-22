import type { NextApiRequest, NextApiResponse } from "next";
import { requireRootApiAuth } from "@/lib/root-api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireRootApiAuth(req, res);
  if (!auth.ok) return;

  return res.status(200).json({ data: auth.rootAdmin });
}
