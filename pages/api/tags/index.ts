import { z } from "zod";
import { createTag, getAllTags } from "@/features/tags/services/tag-service";
import { createTenantApiRoute, tenantApiRoute } from "@/lib/tenant-api-route";

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().trim().min(1).max(30).optional(),
});

export default createTenantApiRoute({
  GET: tenantApiRoute({
    permission: "tickets:read",
    handle: async ({ res, user }) => {
      const tags = await getAllTags(user.organizationId);
      return res.status(200).json({ data: tags });
    },
    unexpectedErrorMessage: "Failed to load tags",
  }),
  POST: tenantApiRoute({
    permission: "tickets:manage-tags",
    schema: createTagSchema,
    mapError: (error) =>
      error instanceof Error && error.message === "Tag name already exists"
        ? { status: 409, message: error.message }
        : null,
    handle: async ({ res, user, input }) => {
      const tag = await createTag({
        ...input,
        organizationId: user.organizationId,
      });
      return res.status(201).json({ data: tag });
    },
    unexpectedErrorMessage: "Failed to create tag",
  }),
});
