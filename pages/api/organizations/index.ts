import { listUserOrganizations } from "@/features/organizations/services/organization-selection-service";
import {
  createProductIdentityApiRoute,
  productIdentityApiRoute,
} from "@/lib/product-identity-api-route";

export default createProductIdentityApiRoute({
  GET: productIdentityApiRoute({
    mapError: (error) =>
      error instanceof Error && error.message === "User not found"
        ? { status: 401, message: "User account is unavailable" }
        : null,
    handle: async ({ res, user }) => {
      const organizations = await listUserOrganizations(user.id);
      return res.status(200).json({ data: organizations });
    },
    unexpectedErrorMessage: "Failed to list organizations",
  }),
});
