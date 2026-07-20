import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { requireRootApiAuth } from "@/lib/root-api-auth";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import {
  listProviders,
  saveProvider,
} from "@/features/providers/services/provider-service";

const providerSchema = z.object({
  key: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  isEnabled: z.boolean(),
  priority: z.number().int().min(0).max(10_000),
  defaultModel: z.string().trim().max(255).optional(),
  baseUrl: z.string().url().max(500).optional().or(z.literal("")),
  configuration: z.record(z.string(), z.unknown()).optional(),
  credential: z.string().max(10_000).optional(),
  credentialLabel: z.string().trim().max(100).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireRootApiAuth(req, res);
  if (!auth.ok) return;

  if (req.method === "GET") {
    return res.status(200).json({ data: await listProviders() });
  }

  if (req.method === "PUT") {
    const parsed = providerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid provider configuration",
        errors: parsed.error.flatten(),
      });
    }

    const provider = await saveProvider(parsed.data);
    await recordAuditEvent({
      actorType: "root-admin",
      rootAdminId: auth.rootAdmin.id,
      action: "provider.updated",
      targetType: "Provider",
      targetId: provider.id,
      metadata: {
        key: provider.key,
        isEnabled: provider.isEnabled,
        credentialRotated: Boolean(parsed.data.credential?.trim()),
      },
    });

    return res.status(200).json({ data: provider });
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ message: "Method not allowed" });
}
