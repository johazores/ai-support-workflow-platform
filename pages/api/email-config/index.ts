import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api-auth";
import {
  getEmailConfig,
  upsertEmailConfig,
} from "@/features/email/services/email-config-service";

const configSchema = z.object({
  smtpHost: z.string().min(1).max(255),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1).max(255),
  smtpPass: z.string().min(1).max(255),
  imapHost: z.string().min(1).max(255),
  imapPort: z.number().int().min(1).max(65535),
  imapUser: z.string().min(1).max(255),
  imapPass: z.string().min(1).max(255),
  fromAddress: z.string().email().max(255),
  fromName: z.string().min(1).max(100),
  isActive: z.boolean(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "email-logs:read");
  if (!auth.ok) return;

  if (req.method === "GET") {
    const config = await getEmailConfig();
    if (!config) return res.status(200).json({ data: null });

    // Mask passwords in response
    return res.status(200).json({
      data: {
        ...config,
        smtpPass: "••••••••",
        imapPass: "••••••••",
      },
    });
  }

  if (req.method === "PUT") {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const config = await upsertEmailConfig(parsed.data);
    return res.status(200).json({
      data: {
        ...config,
        smtpPass: "••••••••",
        imapPass: "••••••••",
      },
    });
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ message: "Method not allowed" });
}
