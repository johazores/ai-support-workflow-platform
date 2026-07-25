import { afterEach, describe, expect, it } from "vitest";
import { isLegacyProductAuthEnabled } from "@/features/auth/services/legacy-auth-config";

const originalNodeEnv = process.env.NODE_ENV;
const originalFlag = process.env.ALLOW_LEGACY_PRODUCT_AUTH;

afterEach(() => {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: originalNodeEnv,
    configurable: true,
    writable: true,
  });

  if (originalFlag === undefined) {
    delete process.env.ALLOW_LEGACY_PRODUCT_AUTH;
  } else {
    process.env.ALLOW_LEGACY_PRODUCT_AUTH = originalFlag;
  }
});

describe("legacy product auth configuration", () => {
  it("requires the explicit migration flag in development", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
      writable: true,
    });
    delete process.env.ALLOW_LEGACY_PRODUCT_AUTH;

    expect(isLegacyProductAuthEnabled()).toBe(false);

    process.env.ALLOW_LEGACY_PRODUCT_AUTH = "true";
    expect(isLegacyProductAuthEnabled()).toBe(true);
  });

  it("stays disabled in production even if the flag is accidentally set", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
      writable: true,
    });
    process.env.ALLOW_LEGACY_PRODUCT_AUTH = "true";

    expect(isLegacyProductAuthEnabled()).toBe(false);
  });

  it("does not accept truthy-looking values other than the exact flag", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
      writable: true,
    });
    process.env.ALLOW_LEGACY_PRODUCT_AUTH = "1";

    expect(isLegacyProductAuthEnabled()).toBe(false);
  });
});
