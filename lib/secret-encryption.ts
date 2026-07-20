import crypto from "node:crypto";

const ENVELOPE_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getEncryptionKey() {
  const encodedKey = process.env.CONFIG_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error("CONFIG_ENCRYPTION_KEY is required");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("CONFIG_ENCRYPTION_KEY must contain 32 base64-encoded bytes");
  }

  return key;
}

export function isEncryptedSecret(value: string) {
  return value.startsWith(`${ENVELOPE_VERSION}.`);
}

export function encryptSecret(plaintext: string) {
  if (!plaintext) throw new Error("Cannot encrypt an empty secret");

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(envelope: string) {
  const [version, ivValue, tagValue, ciphertextValue] = envelope.split(".");
  if (
    version !== ENVELOPE_VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue
  ) {
    throw new Error("Invalid encrypted secret envelope");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Supports existing plaintext records during one-way migration. */
export function readStoredSecret(value: string) {
  return isEncryptedSecret(value) ? decryptSecret(value) : value;
}

export function maskSecret(value?: string | null) {
  if (!value) return null;
  const plaintext = isEncryptedSecret(value) ? decryptSecret(value) : value;
  const suffix = plaintext.slice(-4);
  return suffix ? `••••${suffix}` : "••••••••";
}
