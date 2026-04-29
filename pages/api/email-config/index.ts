import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireApiPermission } from "@/lib/api-auth";
import {
  listEmailConfigs,
  createEmailConfig,
} from "@/features/email/services/email-config-service";

function maskPasswords<T extends Record<string, unknown>>(config: T) {
  return { ...config, smtpPass: "••••••••", imapPass: "••••••••" };
}

const configSchema = z.object({
  name: z.string().min(1).max(100),
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
  isDefault: z.boolean().default(false),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = await requireApiPermission(req, res, "email-logs:read");
  if (!auth.ok) return;

  if (req.method === "GET") {
    const configs = await listEmailConfigs();
    return res.status(200).json({
      data: configs.map(maskPasswords),
    });
  }

  if (req.method === "POST") {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const config = await createEmailConfig(parsed.data);
    return res.status(201).json({ data: maskPasswords(config) });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
