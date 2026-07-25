import type { NextApiRequest } from "next";
import { z } from "zod";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import {
  deleteEmailConfig,
  getEmailConfigById,
  updateEmailConfig,
} from "@/features/email/services/email-config-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

function maskPasswords<T extends Record<string, unknown>>(config: T) {
  return { ...config, smtpPass: "••••••••", imapPass: "••••••••" };
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  smtpHost: z.string().min(1).max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().min(1).max(255).optional(),
  smtpPass: z.string().min(1).max(512).optional(),
  imapHost: z.string().min(1).max(255).optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  imapUser: z.string().min(1).max(255).optional(),
  imapPass: z.string().min(1).max(512).optional(),
  fromAddress: z.string().email().max(255).optional(),
  fromName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

function mailboxIdFrom(req: NextApiRequest) {
  const id = req.query.id;
  if (typeof id !== "string") {
    throw new TenantApiError(400, "Invalid mailbox ID");
  }
  return id;
}

function mapMailboxError(error: unknown) {
  return error instanceof Error && error.message === "Mailbox not found"
    ? { status: 404, message: error.message }
    : null;
}

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "email-settings:manage",
    handle: async ({ req, res, user }) => {
      const config = await getEmailConfigById(
        mailboxIdFrom(req),
        user.organizationId,
      );
      if (!config) throw new TenantApiError(404, "Mailbox not found");
      return res.status(200).json({ data: maskPasswords(config) });
    },
    unexpectedErrorMessage: "Failed to load mailbox",
  }),
  PUT: tenantApiRoute({
    permission: "email-settings:manage",
    schema: updateSchema,
    rateLimit: "sensitive",
    mapError: mapMailboxError,
    handle: async ({ req, res, user, input }) => {
      const id = mailboxIdFrom(req);
      const config = await updateEmailConfig(id, input, user.organizationId);

      await recordAuditEvent({
        actorType: "user",
        userId: user.id,
        organizationId: user.organizationId,
        action: "mailbox.updated",
        targetType: "EmailConfig",
        targetId: config.id,
        metadata: { fields: Object.keys(input) },
      });

      return res.status(200).json({ data: maskPasswords(config) });
    },
    unexpectedErrorMessage: "Failed to update mailbox",
  }),
  DELETE: tenantApiRoute({
    permission: "email-settings:manage",
    rateLimit: "sensitive",
    mapError: mapMailboxError,
    handle: async ({ req, res, user }) => {
      const id = mailboxIdFrom(req);
      await deleteEmailConfig(id, user.organizationId);
      await recordAuditEvent({
        actorType: "user",
        userId: user.id,
        organizationId: user.organizationId,
        action: "mailbox.deleted",
        targetType: "EmailConfig",
        targetId: id,
      });
      return res.status(200).json({ data: { deleted: true } });
    },
    unexpectedErrorMessage: "Failed to delete mailbox",
  }),
});
