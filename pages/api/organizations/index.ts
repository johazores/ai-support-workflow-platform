import type { NextApiRequest, NextApiResponse } from "next";
import { listUserOrganizations } from "@/features/organizations/services/organization-selection-service";
import { requireApiAuth } from "@/lib/api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  try {
    const organizations = await listUserOrganizations(auth.user.id);
    return res.status(200).json({ data: organizations });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      return res.status(401).json({ message: "User account is unavailable" });
    }

    console.error("Failed to list organizations", error);
    return res.status(500).json({ message: "Failed to list organizations" });
  }
}
