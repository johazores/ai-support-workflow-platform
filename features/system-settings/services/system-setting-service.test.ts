import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBooleanSystemSetting } from "@/features/system-settings/services/system-setting-service";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("@/lib/secret-encryption", () => ({
  decryptSecret: vi.fn(),
  encryptSecret: vi.fn(),
  maskSecret: vi.fn(),
}));

describe("getBooleanSystemSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(null);
  });

  it("returns the supplied default when the setting is missing", async () => {
    await expect(getBooleanSystemSetting("feature.enabled", true)).resolves.toBe(
      true,
    );
  });

  it.each([
    [true, true],
    [false, false],
    [1, true],
    [0, false],
    ["true", true],
    ["false", false],
    ["1", true],
    ["0", false],
  ])("normalizes %p to %p", async (value, expected) => {
    mocks.findUnique.mockResolvedValue({
      key: "feature.enabled",
      value,
      encryptedValue: null,
      isSecret: false,
    });

    await expect(getBooleanSystemSetting("feature.enabled")).resolves.toBe(
      expected,
    );
  });

  it("uses the default for unsupported values", async () => {
    mocks.findUnique.mockResolvedValue({
      key: "feature.enabled",
      value: { enabled: true },
      encryptedValue: null,
      isSecret: false,
    });

    await expect(getBooleanSystemSetting("feature.enabled", false)).resolves.toBe(
      false,
    );
  });
});
