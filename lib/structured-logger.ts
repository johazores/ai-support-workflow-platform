type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const sensitiveKeyPattern =
  /(authorization|cookie|password|pass|secret|token|api[-_]?key|credential|smtpPass|imapPass|session|signature)/i;

const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_LENGTH = 50;
const MAX_DEPTH = 8;

function truncateString(value: string) {
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
    : value;
}

export function redactLogValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (depth > MAX_DEPTH) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message),
      ...(process.env.NODE_ENV !== "production" && value.stack
        ? { stack: truncateString(value.stack) }
        : {}),
    };
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((entry) => redactLogValue(entry, depth + 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[circular]";
    seen.add(value);

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = sensitiveKeyPattern.test(key)
        ? "[redacted]"
        : redactLogValue(entry, depth + 1, seen);
    }
    return output;
  }

  return String(value);
}

export function writeStructuredLog(
  level: LogLevel,
  event: string,
  context: LogContext = {},
) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactLogValue(context),
  };
  const serialized = JSON.stringify(record);

  if (level === "error") {
    console.error(serialized);
    return;
  }
  if (level === "warn") {
    console.warn(serialized);
    return;
  }
  console.info(serialized);
}

export function logInfo(event: string, context?: LogContext) {
  writeStructuredLog("info", event, context);
}

export function logWarn(event: string, context?: LogContext) {
  writeStructuredLog("warn", event, context);
}

export function logError(event: string, context?: LogContext) {
  writeStructuredLog("error", event, context);
}
