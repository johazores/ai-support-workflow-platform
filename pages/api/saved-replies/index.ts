import { z } from "zod";
import {
  createSavedReply,
  getAllSavedReplies,
} from "@/features/saved-replies/services/saved-reply-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

const createSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(50_000),
  shortcut: z.string().trim().max(30).optional(),
});

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "saved-replies:read",
    handle: async ({ res, user }) => {
      const replies = await getAllSavedReplies(user.organizationId);
      return res.status(200).json({ data: replies });
    },
    unexpectedErrorMessage: "Failed to load saved replies",
  }),
  POST: tenantApiRoute({
    permission: "saved-replies:manage",
    schema: createSchema,
    handle: async ({ res, user, input }) => {
      const reply = await createSavedReply({
        ...input,
        organizationId: user.organizationId,
      });
      return res.status(201).json({ data: reply });
    },
    unexpectedErrorMessage: "Failed to create saved reply",
  }),
});
