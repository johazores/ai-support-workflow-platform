import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { selectUserOrganization } from "@/features/organizations/services/organization-selection-service";
import { requireApiAuth } from "@/lib/api-auth";

const selectSchema = z.object({
  organizationId: z.string().min(1),
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

  const parsed = selectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const organization = await selectUserOrganization({
      userId: auth.user.id,
      organizationId: parsed.data.organizationId,
    });
    return res.status(200).json({ data: organization });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Organization access denied" ||
        error.message === "User not found")
    ) {
      return res.status(403).json({ message: "Organization access denied" });
    }

    console.error("Failed to select organization", error);
    return res.status(500).json({ message: "Failed to select organization" });
  }
}
