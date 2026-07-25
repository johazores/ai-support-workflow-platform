import { z } from "zod";
import { createFirstOrganization } from "@/features/organizations/services/organization-onboarding-service";
import {
  createProductIdentityApiRoute,
  ProductIdentityApiError,
  productIdentityApiRoute,
} from "@/lib/product-identity-api-route";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export default createProductIdentityApiRoute({
  POST: productIdentityApiRoute({
    schema: createOrganizationSchema,
    rateLimit: "sensitive",
    mapError: (error) => {
      if (!(error instanceof Error)) return null;
      if (error.message === "User already belongs to an organization") {
        return { status: 409, message: error.message };
      }
      if (error.message === "User not found") {
        return { status: 401, message: "User account is unavailable" };
      }
      return null;
    },
    handle: async ({ res, user, input }) => {
      if (user.authProvider !== "clerk") {
        throw new ProductIdentityApiError(403, "Clerk authentication is required");
      }
      if (user.organizationId) {
        throw new ProductIdentityApiError(409, "Organization already configured");
      }

      const organization = await createFirstOrganization({
        userId: user.id,
        name: input.name,
      });
      return res.status(201).json({ data: organization });
    },
    unexpectedErrorMessage: "Failed to create organization",
  }),
});
