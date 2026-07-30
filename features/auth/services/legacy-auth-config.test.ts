import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isLegacyProductAuthEnabled } from "@/features/auth/services/legacy-auth-config";

const mocks = vi.hoisted(() => ({
  getBooleanSystemSetting: vi.fn(),
}));

vi.mock("@/features/system-settings/services/system-setting-service", () => ({
  getBooleanSystemSetting: mocks.getBooleanSystemSetting,
}));

const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "development",
    configurable: true,
    writable: true,
  });
  mocks.getBooleanSystemSetting.mockResolvedValue(false);
});

afterEach(() => {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: originalNodeEnv,
    configurable: true,
    writable: true,
  });
});

describe("legacy product auth configuration", () => {
  it("loads the migration toggle from database settings", async () => {
    await expect(isLegacyProductAuthEnabled()).resolves.toBe(false);

    mocks.getBooleanSystemSetting.mockResolvedValue(true);
    await expect(isLegacyProductAuthEnabled()).resolves.toBe(true);
  });

  it("stays disabled in production even when enabled in the database", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
      writable: true,
    });
    mocks.getBooleanSystemSetting.mockResolvedValue(true);

    await expect(isLegacyProductAuthEnabled()).resolves.toBe(false);
    expect(mocks.getBooleanSystemSetting).not.toHaveBeenCalled();
  });
});
