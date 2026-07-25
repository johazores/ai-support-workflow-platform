const LEGACY_PRODUCT_AUTH_FLAG = "ALLOW_LEGACY_PRODUCT_AUTH";

export function isLegacyProductAuthEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env[LEGACY_PRODUCT_AUTH_FLAG] === "true"
  );
}

export function legacyProductAuthDisabledMessage() {
  return "Legacy product authentication is disabled. Configure Clerk for product users.";
}
