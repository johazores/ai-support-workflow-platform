import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  updateEmailTemplate,
  deleteEmailTemplate,
} from "@/features/email/services/email-template-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireTenantApiPermission(
    req,
    res,
    "email-settings:manage",
  );
  if (!auth.ok) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid template ID" });
  }

  try {
    if (req.method === "PATCH") {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: parsed.error.flatten() });
      }

      const template = await updateEmailTemplate(
        auth.user.organizationId,
        id,
        parsed.data,
      );
      return res.status(200).json({ data: template });
    }

    if (req.method === "DELETE") {
      await deleteEmailTemplate(auth.user.organizationId, id);
      return res.status(200).json({ data: { deleted: true } });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Email template not found"
    ) {
      return res.status(404).json({ message: error.message });
    }
    throw error;
  }

  res.setHeader("Allow", ["PATCH", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
