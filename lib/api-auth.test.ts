import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock session service before importing api-auth
vi.mock("@/features/auth/services/session-service", () => ({
  parseSessionValue: vi.fn(),
}));

import { requireApiAuth, requireApiPermission } from "@/lib/api-auth";
import { parseSessionValue } from "@/features/auth/services/session-service";

const mockParse = vi.mocked(parseSessionValue);

function createMockReq(cookie?: string) {
  return {
    cookies: { support_session: cookie },
  } as never;
}

function createMockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };

  return res as never;
}

describe("requireApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok:true when session is valid", async () => {
    const user = {
      id: "1",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
    };

    mockParse.mockResolvedValue(user);

    const req = createMockReq("valid-token");
    const res = createMockRes();
    const result = await requireApiAuth(req, res);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe("admin@test.com");
    }
  });

  it("returns ok:false and sends 401 when session is null", async () => {
    mockParse.mockResolvedValue(null);

    const req = createMockReq(undefined);
    const res = createMockRes();
    const result = await requireApiAuth(req, res);

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401);
  });

  it("returns ok:false and sends 401 when session is invalid", async () => {
    mockParse.mockResolvedValue(null);

    const req = createMockReq("invalid-token");
    const res = createMockRes();
    const result = await requireApiAuth(req, res);

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401);
  });
});

describe("requireApiPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin to access workflows:manage", async () => {
    mockParse.mockResolvedValue({
      id: "1",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
    });

    const req = createMockReq("token");
    const res = createMockRes();
    const result = await requireApiPermission(req, res, "workflows:manage");

    expect(result.ok).toBe(true);
  });

  it("denies agent access to workflows:manage", async () => {
    mockParse.mockResolvedValue({
      id: "2",
      name: "Agent",
      email: "agent@test.com",
      role: "agent",
    });

    const req = createMockReq("token");
    const res = createMockRes();
    const result = await requireApiPermission(req, res, "workflows:manage");

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    mockParse.mockResolvedValue(null);

    const req = createMockReq(undefined);
    const res = createMockRes();
    const result = await requireApiPermission(req, res, "tickets:read");

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401);
  });

  it("allows supervisor access to analytics:read", async () => {
    mockParse.mockResolvedValue({
      id: "3",
      name: "Supervisor",
      email: "super@test.com",
      role: "supervisor",
    });

    const req = createMockReq("token");
    const res = createMockRes();
    const result = await requireApiPermission(req, res, "analytics:read");

    expect(result.ok).toBe(true);
  });

  it("denies agent access to analytics:read", async () => {
    mockParse.mockResolvedValue({
      id: "4",
      name: "Agent",
      email: "agent@test.com",
      role: "agent",
    });

    const req = createMockReq("token");
    const res = createMockRes();
    const result = await requireApiPermission(req, res, "analytics:read");

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(403);
  });
});
