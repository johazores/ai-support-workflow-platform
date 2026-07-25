import type { NextApiRequest } from "next";
import { z } from "zod";
import {
  deleteSavedReply,
  updateSavedReply,
} from "@/features/saved-replies/services/saved-reply-service";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(50_000),
  shortcut: z.string().trim().max(30).optional(),
});

function savedReplyIdFrom(req: NextApiRequest) {
  const id = req.query.id;
  if (typeof id !== "string") {
    throw new TenantApiError(400, "Invalid saved reply id");
  }
  return id;
}

function mapSavedReplyError(error: unknown) {
  return error instanceof Error && error.message === "Saved reply not found"
    ? { status: 404, message: error.message }
    : null;
}

export default createTenantApiRoute({
  PUT: tenantApiRoute({
    permission: "saved-replies:manage",
    schema: updateSchema,
    mapError: mapSavedReplyError,
    handle: async ({ req, res, user, input }) => {
      const reply = await updateSavedReply({
        id: savedReplyIdFrom(req),
        organizationId: user.organizationId,
        ...input,
      });
      return res.status(200).json({ data: reply });
    },
    unexpectedErrorMessage: "Failed to update saved reply",
  }),
  DELETE: tenantApiRoute({
    permission: "saved-replies:manage",
    mapError: mapSavedReplyError,
    handle: async ({ req, res, user }) => {
      await deleteSavedReply(user.organizationId, savedReplyIdFrom(req));
      return res.status(200).json({ data: { deleted: true } });
    },
    unexpectedErrorMessage: "Failed to delete saved reply",
  }),
});
