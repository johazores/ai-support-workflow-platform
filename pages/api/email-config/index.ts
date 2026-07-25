import { z } from "zod";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import {
  createEmailConfig,
  listEmailConfigs,
} from "@/features/email/services/email-config-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

function maskPasswords<T extends Record<string, unknown>>(config: T) {
  return { ...config, smtpPass: "••••••••", imapPass: "••••••••" };
}

const configSchema = z.object({
  name: z.string().min(1).max(100),
  smtpHost: z.string().min(1).max(255),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1).max(255),
  smtpPass: z.string().min(1).max(512),
  imapHost: z.string().min(1).max(255),
  imapPort: z.number().int().min(1).max(65535),
  imapUser: z.string().min(1).max(255),
  imapPass: z.string().min(1).max(512),
  fromAddress: z.string().email().max(255),
  fromName: z.string().min(1).max(100),
  isActive: z.boolean(),
  isDefault: z.boolean().default(false),
});

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "email-settings:manage",
    handle: async ({ res, user }) => {
      const configs = await listEmailConfigs(user.organizationId);
      return res.status(200).json({ data: configs.map(maskPasswords) });
    },
    unexpectedErrorMessage: "Failed to load mailboxes",
  }),
  POST: tenantApiRoute({
    permission: "email-settings:manage",
    schema: configSchema,
    rateLimit: "sensitive",
    handle: async ({ res, user, input }) => {
      const config = await createEmailConfig({
        ...input,
        organizationId: user.organizationId,
      });

      await recordAuditEvent({
        actorType: "user",
        userId: user.id,
        organizationId: user.organizationId,
        action: "mailbox.created",
        targetType: "EmailConfig",
        targetId: config.id,
        metadata: { name: config.name, fromAddress: config.fromAddress },
      });

      return res.status(201).json({ data: maskPasswords(config) });
    },
    unexpectedErrorMessage: "Failed to create mailbox",
  }),
});
