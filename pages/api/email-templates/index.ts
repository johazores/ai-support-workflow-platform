import { z } from "zod";
import {
  createEmailTemplate,
  listEmailTemplates,
} from "@/features/email/services/email-template-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
} from "@/lib/tenant-api-route";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(200),
  body: z.string().min(1).max(10_000),
});

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "email-logs:read",
    handle: async ({ res, user }) => {
      const templates = await listEmailTemplates(user.organizationId);
      res.status(200).json({ data: templates });
    },
    unexpectedErrorMessage: "Failed to list email templates",
  }),

  POST: tenantApiRoute({
    permission: "email-settings:manage",
    schema: createSchema,
    handle: async ({ res, user, input }) => {
      const template = await createEmailTemplate({
        organizationId: user.organizationId,
        ...input,
      });
      res.status(201).json({ data: template });
    },
    unexpectedErrorMessage: "Failed to create email template",
  }),
});
