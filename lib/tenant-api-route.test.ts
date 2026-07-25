import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  createTenantApiRoute,
  tenantApiRoute,
  TenantApiError,
} from "@/lib/tenant-api-route";

const mocks = vi.hoisted(() => ({
  requireTenantApiPermission: vi.fn(),
}));

vi.mock("@/lib/tenant-api-auth", () => ({
  requireTenantApiPermission: mocks.requireTenantApiPermission,
}));

const user = {
  id: "user-1",
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
  organizationId: "org-1",
};

function request(input?: {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  return {
    method: input?.method ?? "GET",
    body: input?.body,
    query: input?.query ?? {},
    headers: {
      host: "support.example.com",
      "x-forwarded-proto": "https",
      origin: "https://support.example.com",
      ...(input?.headers ?? {}),
    },
    url: "/api/test",
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

describe("createTenantApiRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTenantApiPermission.mockResolvedValue({ ok: true, user });
  });

  it("rejects unsupported methods before authentication", async () => {
    const handler = createTenantApiRoute({
      GET: tenantApiRoute({
        permission: "tickets:read",
        handle: async ({ res }) => {
          res.status(200).json({ data: true });
        },
      }),
    });
    const res = response();

    await handler(request({ method: "POST" }), res);

    expect(res.setHeader).toHaveBeenCalledWith("Allow", ["GET"]);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(mocks.requireTenantApiPermission).not.toHaveBeenCalled();
  });

  it("rejects cross-origin mutations before authentication", async () => {
    const handler = createTenantApiRoute({
      POST: tenantApiRoute({
        permission: "tickets:write",
        handle: async ({ res }) => {
          res.status(200).json({ data: true });
        },
      }),
    });
    const res = response();

    await handler(
      request({
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid request origin",
        requestId: expect.any(String),
      }),
    );
    expect(mocks.requireTenantApiPermission).not.toHaveBeenCalled();
  });

  it("authenticates with the route-specific permission", async () => {
    const handle = vi.fn(async ({ res }) => {
      res.status(200).json({ data: true });
    });
    const handler = createTenantApiRoute({
      GET: tenantApiRoute({
        permission: "analytics:read",
        handle,
      }),
    });
    const req = request({ method: "GET" });
    const res = response();

    await handler(req, res);

    expect(mocks.requireTenantApiPermission).toHaveBeenCalledWith(
      req,
      res,
      "analytics:read",
    );
    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ user, input: undefined }),
    );
  });

  it("parses Zod input and exposes it to the handler", async () => {
    const handle = vi.fn(async ({ res }) => {
      res.status(201).json({ data: true });
    });
    const handler = createTenantApiRoute({
      POST: tenantApiRoute({
        permission: "workflows:manage",
        schema: z.object({ name: z.string().min(1) }),
        handle,
      }),
    });
    const res = response();

    await handler(request({ method: "POST", body: { name: "Workflow" } }), res);

    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ input: { name: "Workflow" } }),
    );
  });

  it("returns normalized validation errors without calling the handler", async () => {
    const handle = vi.fn();
    const handler = createTenantApiRoute({
      POST: tenantApiRoute({
        permission: "workflows:manage",
        schema: z.object({ name: z.string().min(1) }),
        handle,
      }),
    });
    const res = response();

    await handler(request({ method: "POST", body: { name: "" } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid request",
        errors: expect.any(Object),
        requestId: expect.any(String),
      }),
    );
    expect(handle).not.toHaveBeenCalled();
  });

  it("supports route-specific query parsing", async () => {
    const handle = vi.fn(async ({ res }) => {
      res.status(200).json({ data: true });
    });
    const handler = createTenantApiRoute({
      GET: tenantApiRoute({
        permission: "tickets:read",
        schema: z.object({ ticketId: z.string().min(1) }),
        parse: (req) => ({ ticketId: req.query.id }),
        handle,
      }),
    });
    const res = response();

    await handler(
      request({ method: "GET", query: { id: "ticket-1" } }),
      res,
    );

    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ input: { ticketId: "ticket-1" } }),
    );
  });

  it("maps expected domain errors without leaking raw failures", async () => {
    const handler = createTenantApiRoute({
      DELETE: tenantApiRoute({
        permission: "workflows:manage",
        handle: async () => {
          throw new Error("Workflow not found");
        },
        mapError: (error) =>
          error instanceof Error && error.message === "Workflow not found"
            ? { status: 404, message: error.message }
            : null,
      }),
    });
    const res = response();

    await handler(request({ method: "DELETE" }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Workflow not found" }),
    );
  });

  it("supports explicit TenantApiError responses", async () => {
    const handler = createTenantApiRoute({
      POST: tenantApiRoute({
        permission: "tickets:write",
        handle: async () => {
          throw new TenantApiError(409, "Conflict", { code: "already_done" });
        },
      }),
    });
    const res = response();

    await handler(request({ method: "POST" }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Conflict",
        code: "already_done",
      }),
    );
  });

  it("reuses a valid incoming request ID and replaces unsafe values", async () => {
    const handler = createTenantApiRoute({
      GET: tenantApiRoute({
        permission: "tickets:read",
        handle: async ({ res }) => {
          res.status(200).json({ data: true });
        },
      }),
    });

    const res1 = response();
    await handler(
      request({ method: "GET", headers: { "x-request-id": "client-1234" } }),
      res1,
    );
    expect(res1.setHeader).toHaveBeenCalledWith("X-Request-ID", "client-1234");

    const res2 = response();
    await handler(
      request({ method: "GET", headers: { "x-request-id": "<unsafe>" } }),
      res2,
    );
    const requestIdCall = res2.setHeader.mock.calls.find(
      ([name]) => name === "X-Request-ID",
    );
    expect(requestIdCall?.[1]).not.toBe("<unsafe>");
  });
});
