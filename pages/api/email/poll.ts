import { z } from "zod";
import {
  pollAllInboxes,
  pollInboxById,
} from "@/features/email/services/imap-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
} from "@/lib/tenant-api-route";

const pollSchema = z.object({
  mailboxId: z.string().trim().min(1).max(100).optional(),
});

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "email-settings:manage",
    schema: pollSchema,
    handle: async ({ res, user, input }) => {
      if (input.mailboxId) {
        const result = await pollInboxById(user.organizationId, input.mailboxId);
        res.status(200).json({ data: result });
        return;
      }

      const results = await pollAllInboxes(user.organizationId);
      res.status(200).json({ data: results });
    },
    unexpectedErrorMessage: "Failed to poll inbox",
  }),
});
