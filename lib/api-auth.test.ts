import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireApiAuth, requireApiPermission } from "@/lib/api-auth";

const mocks = vi.hoisted(() => ({
  isClerkConfigured: vi.fn(),
  getClerkApiSessionUser: vi.fn(),
  isLegacyProductAuthEnabled: vi.fn(),
  parseSessionValue: vi.fn(),
}));

vi.mock("@/features/auth/services/clerk-config", () => ({
  isClerkConfigured: mocks.isClerkConfigured,
}));

vi.mock("@/features/auth/services/clerk-session-service", () => ({
  getClerkApiSessionUser: mocks.getClerkApiSessionUser,
}));

vi.mock("@/features/auth/services/legacy-auth-config", () => ({
  isLegacyProductAuthEnabled: mocks.isLegacyProductAuthEnabled,
}));

vi.mock("@/features/auth/services/session-service", () => ({
  parseSessionValue: mocks.parseSessionValue,
}));

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

const admin = {
  id: "1",
  name: "Admin",
  email: "admin@test.com",
  role: "admin",
};

const agent = {
  id: "2",
  name: "Agent",
  email: "agent@test.com",
  role: "agent",
};

describe("requireApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isClerkConfigured.mockReturnValue(true);
    mocks.getClerkApiSessionUser.mockResolvedValue(null);
    mocks.isLegacyProductAuthEnabled.mockReturnValue(false);
    mocks.parseSessionValue.mockResolvedValue(null);
  });

  it("uses Clerk exclusively whenever Clerk is configured", async () => {
    mocks.getClerkApiSessionUser.mockResolvedValue(admin);
    mocks.parseSessionValue.mockResolvedValue(agent);

    const result = await requireApiAuth(createMockReq("legacy-token"), createMockRes());

    expect(result).toEqual({ ok: true, user: admin });
    expect(mocks.parseSessionValue).not.toHaveBeenCalled();
  });

  it("does not fall back to a legacy cookie after Clerk authentication fails", async () => {
    mocks.parseSessionValue.mockResolvedValue(admin);
    const res = createMockRes();

    const result = await requireApiAuth(createMockReq("legacy-token"), res);

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401);
    expect(mocks.parseSessionValue).not.toHaveBeenCalled();
  });

  it("accepts the migration cookie only when Clerk is absent and legacy auth is enabled", async () => {
    mocks.isClerkConfigured.mockReturnValue(false);
    mocks.isLegacyProductAuthEnabled.mockReturnValue(true);
    mocks.parseSessionValue.mockResolvedValue(admin);

    const result = await requireApiAuth(createMockReq("legacy-token"), createMockRes());

    expect(result).toEqual({ ok: true, user: admin });
    expect(mocks.parseSessionValue).toHaveBeenCalledWith("legacy-token");
  });

  it("fails closed when neither Clerk nor the development migration mode is available", async () => {
    mocks.isClerkConfigured.mockReturnValue(false);
    mocks.isLegacyProductAuthEnabled.mockReturnValue(false);
    const res = createMockRes();

    const result = await requireApiAuth(createMockReq("legacy-token"), res);

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401);
    expect((res as unknown as { body: unknown }).body).toEqual({
      message: "Product authentication unavailable",
    });
    expect(mocks.parseSessionValue).not.toHaveBeenCalled();
  });
});

describe("requireApiPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isClerkConfigured.mockReturnValue(true);
    mocks.isLegacyProductAuthEnabled.mockReturnValue(false);
  });

  it("allows an authenticated admin with the requested permission", async () => {
    mocks.getClerkApiSessionUser.mockResolvedValue(admin);

    const result = await requireApiPermission(
      createMockReq(),
      createMockRes(),
      "workflows:manage",
    );

    expect(result.ok).toBe(true);
  });

  it("denies an authenticated role without the requested permission", async () => {
    mocks.getClerkApiSessionUser.mockResolvedValue(agent);
    const res = createMockRes();

    const result = await requireApiPermission(
      createMockReq(),
      res,
      "workflows:manage",
    );

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(403);
  });

  it("returns 401 when Clerk has no authenticated user", async () => {
    mocks.getClerkApiSessionUser.mockResolvedValue(null);
    const res = createMockRes();

    const result = await requireApiPermission(
      createMockReq(),
      res,
      "tickets:read",
    );

    expect(result.ok).toBe(false);
    expect((res as unknown as { statusCode: number }).statusCode).toBe(401);
  });
});
