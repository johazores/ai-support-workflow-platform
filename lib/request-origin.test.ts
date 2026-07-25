import type { NextApiRequest } from "next";
import { afterEach, describe, expect, it } from "vitest";
import {
  allowedRequestOrigins,
  isSameOriginMutation,
} from "@/lib/request-origin";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;

  Object.defineProperty(process.env, "NODE_ENV", {
    value: originalNodeEnv,
    configurable: true,
    writable: true,
  });
});

function request(headers: Record<string, string>): NextApiRequest {
  return { headers } as unknown as NextApiRequest;
}

describe("same-origin request validation", () => {
  it("accepts the configured application origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://support.example.com/app";

    expect(
      isSameOriginMutation(
        request({
          origin: "https://support.example.com",
          host: "internal.example.net",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(true);
  });

  it("accepts the forwarded request host origin", () => {
    expect(
      isSameOriginMutation(
        request({
          origin: "https://support.example.com",
          "x-forwarded-host": "support.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(true);
  });

  it("falls back to a same-origin referer when Origin is absent", () => {
    expect(
      isSameOriginMutation(
        request({
          referer: "https://support.example.com/inbox/ticket-1",
          host: "support.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(true);
  });

  it("rejects a cross-origin mutation", () => {
    expect(
      isSameOriginMutation(
        request({
          origin: "https://evil.example",
          host: "support.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(false);
  });

  it("rejects malformed or null origins", () => {
    expect(
      isSameOriginMutation(
        request({
          origin: "null",
          host: "support.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(false);
  });

  it("fails closed when neither Origin nor Referer is available", () => {
    expect(
      isSameOriginMutation(
        request({
          host: "support.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(false);
  });

  it("uses http for an unforwarded local development host", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
      writable: true,
    });

    expect(allowedRequestOrigins(request({ host: "localhost:3000" }))).toEqual(
      new Set(["http://localhost:3000"]),
    );
  });
});
