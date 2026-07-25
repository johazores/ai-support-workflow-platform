import { z } from "zod";
import { generateAiDraftReply } from "@/features/ai-drafts/services/ai-draft-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

const generateDraftSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  customerName: z.string().trim().min(1).max(200),
  customerMessage: z.string().trim().min(1).max(50_000),
  tone: z
    .enum(["professional", "friendly", "concise", "empathetic"])
    .optional(),
});

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "ai:generate",
    schema: generateDraftSchema,
    rateLimit: "sensitive",
    mapError: (error) => ({
      status: 502,
      message:
        error instanceof Error
          ? error.message
          : "No configured AI provider completed the request",
    }),
    handle: async ({ res, user, input }) => {
      const draft = await generateAiDraftReply({
        ...input,
        organizationId: user.organizationId,
      });
      return res.status(200).json({ data: draft });
    },
  }),
});
