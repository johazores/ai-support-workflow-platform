import type { NextApiRequest } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enforceRequestRateLimit, getRequestIp } from "@/lib/rate-limit";

const mocks = vi.hoisted(() => ({
  runCommandRaw: vi.fn(),
  counters: new Map<string, number>(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $runCommandRaw: mocks.runCommandRaw,
  },
}));

function request(headers: Record<string, string> = {}) {
  return {
    headers,
    socket: { remoteAddress: "10.0.0.9" },
  } as unknown as NextApiRequest;
}

describe("request rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.counters.clear();
    mocks.runCommandRaw.mockImplementation(async (command: unknown) => {
      const value = command as {
        delete?: string;
        findAndModify?: string;
        query?: { _id?: string };
      };
      if (value.delete) return { ok: 1 };

      const key = value.query?._id;
      if (!key) throw new Error("Missing rate-limit bucket key");
      const count = (mocks.counters.get(key) ?? 0) + 1;
      mocks.counters.set(key, count);
      return { value: { count } };
    });
  });

  it("uses the first forwarded address as the request IP", () => {
    expect(
      getRequestIp(
        request({
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "x-real-ip": "198.51.100.5",
        }),
      ),
    ).toBe("203.0.113.10");
  });

  it("enforces IP, identity, and organization dimensions together", async () => {
    const result = await enforceRequestRateLimit({
      req: request({ "x-forwarded-for": "203.0.113.10" }),
      rateLimitClass: "write",
      identityId: "user-1",
      organizationId: "org-1",
      now: new Date("2026-07-25T06:00:10.000Z"),
    });

    expect(result).toEqual(
      expect.objectContaining({
        allowed: true,
        limit: 90,
        remaining: 89,
      }),
    );
    expect(mocks.counters.size).toBe(3);
  });

  it("blocks a sensitive IP after the fixed-window limit is exceeded", async () => {
    const req = request({ "x-forwarded-for": "203.0.113.20" });
    const now = new Date("2026-07-25T06:00:10.000Z");

    for (let index = 0; index < 30; index += 1) {
      const result = await enforceRequestRateLimit({
        req,
        rateLimitClass: "sensitive",
        now,
      });
      expect(result.allowed).toBe(true);
    }

    const blocked = await enforceRequestRateLimit({
      req,
      rateLimitClass: "sensitive",
      now,
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.blockedDimension).toBe("ip");
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("starts a fresh bucket in the next window", async () => {
    const req = request({ "x-forwarded-for": "203.0.113.30" });

    const first = await enforceRequestRateLimit({
      req,
      rateLimitClass: "sensitive",
      now: new Date("2026-07-25T06:00:10.000Z"),
    });
    const nextWindow = await enforceRequestRateLimit({
      req,
      rateLimitClass: "sensitive",
      now: new Date("2026-07-25T06:15:10.000Z"),
    });

    expect(first.remaining).toBe(29);
    expect(nextWindow.remaining).toBe(29);
    expect(mocks.counters.size).toBe(2);
  });
});
