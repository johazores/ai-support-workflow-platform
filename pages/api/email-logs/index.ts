import { z } from "zod";
import { listEmailLogs } from "@/features/email-logs/services/email-log-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
} from "@/lib/tenant-api-route";

const querySchema = z.object({
  status: z.string().trim().min(1).max(50).optional(),
  mailboxId: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "email-logs:read",
    schema: querySchema,
    parse: (req) => ({
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      mailboxId:
        typeof req.query.mailboxId === "string" ? req.query.mailboxId : undefined,
      limit: req.query.limit ?? 50,
      offset: req.query.offset ?? 0,
    }),
    handle: async ({ res, user, input }) => {
      const result = await listEmailLogs(user.organizationId, input);
      res.status(200).json({ data: result });
    },
    unexpectedErrorMessage: "Failed to list email logs",
  }),
});
