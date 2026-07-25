import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createProductIdentityApiRoute,
  ProductIdentityApiError,
  productIdentityApiRoute,
} from "@/lib/product-identity-api-route";

const mocks = vi.hoisted(() => ({
  requireApiAuth: vi.fn(),
  enforceRequestRateLimit: vi.fn(),
  applyRateLimitHeaders: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  requireApiAuth: mocks.requireApiAuth,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRequestRateLimit: mocks.enforceRequestRateLimit,
  applyRateLimitHeaders: mocks.applyRateLimitHeaders,
}));

const user = {
  id: "user-1",
  name: "User",
  email: "user@example.com",
  role: "agent",
  authProvider: "clerk" as const,
};

const allowedRateLimit = {
  allowed: true,
  limit: 300,
  remaining: 299,
  resetAt: new Date("2026-07-25T07:01:00.000Z"),
  retryAfterSeconds: 50,
};

function request(input?: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  return {
    method: input?.method ?? "GET",
    body: input?.body,
    query: {},
    headers: {
      host: "support.example.com",
      "x-forwarded-proto": "https",
      origin: "https://support.example.com",
      ...(input?.headers ?? {}),
    },
    url: "/api/organizations",
  } as never;
}

function response() {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.end.mockReturnValue(res);
  return res as never;
}

describe("createProductIdentityApiRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAuth.mockResolvedValue({ ok: true, user });
    mocks.enforceRequestRateLimit.mockResolvedValue(allowedRateLimit);
  });

  it("rejects unsupported methods before authentication", async () => {
    const handler = createProductIdentityApiRoute({
      GET: productIdentityApiRoute({
        handle: async ({ res }) => res.status(200).json({ data: true }),
      }),
    });
    const res = response();

    await handler(request({ method: "POST" }), res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(mocks.requireApiAuth).not.toHaveBeenCalled();
  });

  it("rejects cross-origin mutations before authentication", async () => {
    const handler = createProductIdentityApiRoute({
      POST: productIdentityApiRoute({
        handle: async ({ res }) => res.status(200).json({ data: true }),
      }),
    });
    const res = response();

    await handler(
      request({ method: "POST", headers: { origin: "https://evil.example" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mocks.requireApiAuth).not.toHaveBeenCalled();
  });

  it("authenticates and rate-limits by product identity without requiring a tenant", async () => {
    const handle = vi.fn(async ({ res }) =>
      res.status(200).json({ data: true }),
    );
    const handler = createProductIdentityApiRoute({
      GET: productIdentityApiRoute({ handle }),
    });
    const req = request();
    const res = response();

    await handler(req, res);

    expect(mocks.requireApiAuth).toHaveBeenCalledWith(req, res);
    expect(mocks.enforceRequestRateLimit).toHaveBeenCalledWith({
      req,
      rateLimitClass: "read",
      identityId: "user-1",
    });
    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ user, input: undefined }),
    );
  });

  it("validates mutation input before the handler", async () => {
    const handle = vi.fn();
    const handler = createProductIdentityApiRoute({
      POST: productIdentityApiRoute({
        schema: z.object({ organizationId: z.string().min(1) }),
        handle,
      }),
    });
    const res = response();

    await handler(request({ method: "POST", body: { organizationId: "" } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(handle).not.toHaveBeenCalled();
  });

  it("returns 429 before business logic when the identity limit is exceeded", async () => {
    mocks.enforceRequestRateLimit.mockResolvedValue({
      ...allowedRateLimit,
      allowed: false,
      remaining: 0,
      blockedDimension: "identity",
    });
    const handle = vi.fn();
    const handler = createProductIdentityApiRoute({
      POST: productIdentityApiRoute({ rateLimit: "sensitive", handle }),
    });
    const res = response();

    await handler(request({ method: "POST" }), res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(handle).not.toHaveBeenCalled();
  });

  it("supports explicit identity-boundary domain errors", async () => {
    const handler = createProductIdentityApiRoute({
      POST: productIdentityApiRoute({
        handle: async () => {
          throw new ProductIdentityApiError(409, "Organization already configured");
        },
      }),
    });
    const res = response();

    await handler(request({ method: "POST" }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Organization already configured" }),
    );
  });
});
