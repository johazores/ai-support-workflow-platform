import { z } from "zod";
import { selectUserOrganization } from "@/features/organizations/services/organization-selection-service";
import {
  createProductIdentityApiRoute,
  productIdentityApiRoute,
} from "@/lib/product-identity-api-route";

const selectSchema = z.object({
  organizationId: z.string().min(1),
});

export default createProductIdentityApiRoute({
  POST: productIdentityApiRoute({
    schema: selectSchema,
    rateLimit: "sensitive",
    mapError: (error) =>
      error instanceof Error &&
      (error.message === "Organization access denied" ||
        error.message === "User not found")
        ? { status: 403, message: "Organization access denied" }
        : null,
    handle: async ({ res, user, input }) => {
      const organization = await selectUserOrganization({
        userId: user.id,
        organizationId: input.organizationId,
      });
      return res.status(200).json({ data: organization });
    },
    unexpectedErrorMessage: "Failed to select organization",
  }),
});
