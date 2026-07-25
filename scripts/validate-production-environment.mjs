import process from "node:process";

const errors = [];
const warnings = [];

function required(name, options = {}) {
  const value = process.env[name]?.trim();
  if (!value) {
    errors.push(`${name} is required`);
    return "";
  }
  if (options.minLength && value.length < options.minLength) {
    errors.push(`${name} must be at least ${options.minLength} characters`);
  }
  return value;
}

function optional(name) {
  return process.env[name]?.trim() ?? "";
}

function validUrl(name, value, { requireHttps = false } = {}) {
  if (!value) return;

  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) {
      errors.push(`${name} must use http or https`);
      return;
    }
    if (requireHttps && url.protocol !== "https:") {
      errors.push(`${name} must use https in production`);
    }
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}

function validateBase64Key(name, value, expectedBytes) {
  if (!value) return;

  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length !== expectedBytes) {
      errors.push(`${name} must decode to exactly ${expectedBytes} bytes`);
    }
  } catch {
    errors.push(`${name} must be valid base64`);
  }
}

function forbidTruthy(name) {
  const value = optional(name).toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) {
    errors.push(`${name} must not be enabled in production`);
  }
}

function requireProductionMode() {
  if (process.env.NODE_ENV !== "production") {
    warnings.push(
      `NODE_ENV is ${process.env.NODE_ENV || "unset"}; this validator is intended for production configuration`,
    );
  }
}

requireProductionMode();

const databaseUrl = required("DATABASE_URL");
if (databaseUrl && !databaseUrl.startsWith("mongodb")) {
  errors.push("DATABASE_URL must use a MongoDB connection string");
}

required("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
required("CLERK_SECRET_KEY");
required("CLERK_WEBHOOK_SIGNING_SECRET");
required("ROOT_SESSION_SECRET", { minLength: 32 });
required("WEBHOOK_SECRET", { minLength: 24 });

const encryptionKey = required("CONFIG_ENCRYPTION_KEY");
validateBase64Key("CONFIG_ENCRYPTION_KEY", encryptionKey, 32);

const appUrl = optional("NEXT_PUBLIC_APP_URL") || optional("APP_URL");
if (!appUrl) {
  errors.push("NEXT_PUBLIC_APP_URL or APP_URL is required");
} else {
  validUrl("application URL", appUrl, { requireHttps: true });
}

forbidTruthy("ALLOW_LEGACY_PRODUCT_AUTH");
forbidTruthy("ALLOW_MOCK_AI");

const sessionSecret = optional("SESSION_SECRET");
if (sessionSecret) {
  warnings.push(
    "SESSION_SECRET is present. It is migration-only and should be removed once legacy product sessions are deleted.",
  );
}

const rootPassword = optional("ROOT_ADMIN_PASSWORD");
if (rootPassword) {
  warnings.push(
    "ROOT_ADMIN_PASSWORD is present. Remove bootstrap credentials from the runtime environment after Root Admin provisioning when operationally possible.",
  );
}

const result = {
  ok: errors.length === 0,
  checkedAt: new Date().toISOString(),
  errorCount: errors.length,
  warningCount: warnings.length,
  errors,
  warnings,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) process.exitCode = 1;
