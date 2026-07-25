import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { createFirstOrganization } from "@/features/organizations/services/organization-onboarding-service";
import { requireApiAuth } from "@/lib/api-auth";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = await requireApiAuth(req, res);
  if (!auth.ok) return;

  if (auth.user.authProvider !== "clerk") {
    return res.status(403).json({ message: "Clerk authentication is required" });
  }

  if (auth.user.organizationId) {
    return res.status(409).json({ message: "Organization already configured" });
  }

  const parsed = createOrganizationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const organization = await createFirstOrganization({
      userId: auth.user.id,
      name: parsed.data.name,
    });
    return res.status(201).json({ data: organization });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User already belongs to an organization") {
        return res.status(409).json({ message: error.message });
      }

      if (error.message === "User not found") {
        return res.status(401).json({ message: "User account is unavailable" });
      }
    }

    console.error("Failed to create first organization", error);
    return res.status(500).json({ message: "Failed to create organization" });
  }
}
