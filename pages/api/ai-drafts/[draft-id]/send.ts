import type { NextApiRequest } from "next";
import { sendDraft } from "@/features/ai-drafts/services/send-draft-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

function draftIdFrom(req: NextApiRequest) {
  const draftId = req.query["draft-id"];
  if (typeof draftId !== "string") {
    throw new TenantApiError(400, "Invalid draft id");
  }
  return draftId;
}

export default createTenantApiRoute({
  POST: tenantApiRoute({
    permission: "tickets:write",
    rateLimit: "sensitive",
    mapError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to send draft";
      return {
        status: message === "Draft not found" ? 404 : 502,
        message,
      };
    },
    handle: async ({ req, res, user }) => {
      const message = await sendDraft({
        organizationId: user.organizationId,
        draftId: draftIdFrom(req),
      });
      return res.status(200).json({ data: message });
    },
  }),
});
