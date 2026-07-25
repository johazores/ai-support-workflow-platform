import { z } from "zod";
import { saveDraft } from "@/features/ai-drafts/services/draft-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

const saveDraftSchema = z.object({
  ticketId: z.string().min(1).max(100),
  body: z.string().trim().min(1).max(50_000),
});

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "tickets:write",
    schema: saveDraftSchema,
    mapError: (error) =>
      error instanceof Error && error.message === "Ticket not found"
        ? { status: 404, message: error.message }
        : null,
    handle: async ({ res, user, input }) => {
      const draft = await saveDraft({
        ...input,
        organizationId: user.organizationId,
      });
      return res.status(201).json({ data: draft });
    },
    unexpectedErrorMessage: "Failed to save draft",
  }),
});
