import { afterEach, describe, expect, it, vi } from "vitest";
import {
  redactLogValue,
  writeStructuredLog,
} from "@/lib/structured-logger";

describe("structured logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts nested secrets and authorization data", () => {
    expect(
      redactLogValue({
        organizationId: "org-1",
        authorization: "Bearer secret",
        nested: {
          apiKey: "sk-secret",
          smtpPass: "password",
          safe: "visible",
        },
      }),
    ).toEqual({
      organizationId: "org-1",
      authorization: "[redacted]",
      nested: {
        apiKey: "[redacted]",
        smtpPass: "[redacted]",
        safe: "visible",
      },
    });
  });

  it("handles circular structures without throwing", () => {
    const value: Record<string, unknown> = { id: "ticket-1" };
    value.self = value;

    expect(redactLogValue(value)).toEqual({
      id: "ticket-1",
      self: "[circular]",
    });
  });

  it("omits production error stacks", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const redacted = redactLogValue(new Error("boom"));
    process.env.NODE_ENV = previous;

    expect(redacted).toEqual({ name: "Error", message: "boom" });
  });

  it("emits one JSON record to the matching console level", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    writeStructuredLog("info", "ticket.updated", {
      requestId: "req-12345678",
      token: "secret",
    });

    expect(info).toHaveBeenCalledTimes(1);
    const record = JSON.parse(info.mock.calls[0]?.[0] ?? "{}") as {
      level: string;
      event: string;
      requestId: string;
      token: string;
      timestamp: string;
    };
    expect(record.level).toBe("info");
    expect(record.event).toBe("ticket.updated");
    expect(record.requestId).toBe("req-12345678");
    expect(record.token).toBe("[redacted]");
    expect(Number.isNaN(Date.parse(record.timestamp))).toBe(false);
  });
});
