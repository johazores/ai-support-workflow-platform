import { z } from "zod";
import {
  deleteEmailTemplate,
  updateEmailTemplate,
} from "@/features/email/services/email-template-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().min(1).max(10_000).optional(),
});

function templateIdFrom(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new TenantApiError(400, "Invalid template ID");
  }
  return value;
}

function mapTemplateError(error: unknown) {
  return error instanceof Error && error.message === "Email template not found"
    ? { status: 404, message: error.message }
    : null;
}

export default createTenantApiRoute({
  PATCH: tenantApiRoute({
    permission: "email-settings:manage",
    schema: updateSchema,
    handle: async ({ req, res, user, input }) => {
      const template = await updateEmailTemplate(
        user.organizationId,
        templateIdFrom(req.query.id),
        input,
      );
      res.status(200).json({ data: template });
    },
    mapError: mapTemplateError,
    unexpectedErrorMessage: "Failed to update email template",
  }),

  DELETE: tenantApiRoute({
    permission: "email-settings:manage",
    handle: async ({ req, res, user }) => {
      await deleteEmailTemplate(user.organizationId, templateIdFrom(req.query.id));
      res.status(200).json({ data: { deleted: true } });
    },
    mapError: mapTemplateError,
    unexpectedErrorMessage: "Failed to delete email template",
  }),
});
