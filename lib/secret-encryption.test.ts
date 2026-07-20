import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  maskSecret,
  readStoredSecret,
} from "@/lib/secret-encryption";

const originalKey = process.env.CONFIG_ENCRYPTION_KEY;

describe("secret encryption", () => {
  beforeEach(() => {
    process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.CONFIG_ENCRYPTION_KEY;
    else process.env.CONFIG_ENCRYPTION_KEY = originalKey;
  });

  it("encrypts and decrypts with an authenticated envelope", () => {
    const encrypted = encryptSecret("sk-live-example-1234");

    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain("sk-live-example-1234");
    expect(decryptSecret(encrypted)).toBe("sk-live-example-1234");
  });

  it("produces unique ciphertext for the same value", () => {
    expect(encryptSecret("same-value")).not.toBe(encryptSecret("same-value"));
  });

  it("rejects a modified authentication tag", () => {
    const encrypted = encryptSecret("sensitive");
    const parts = encrypted.split(".");
    parts[2] = Buffer.alloc(16, 2).toString("base64url");

    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("reads legacy plaintext values during migration", () => {
    expect(readStoredSecret("legacy-secret")).toBe("legacy-secret");
  });

  it("masks configured values", () => {
    expect(maskSecret(encryptSecret("secret-ending-9876"))).toBe("••••9876");
  });
});
