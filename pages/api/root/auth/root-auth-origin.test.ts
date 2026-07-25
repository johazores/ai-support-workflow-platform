import { beforeEach, describe, expect, it, vi } from "vitest";
import loginHandler from "@/pages/api/root/auth/login";
import logoutHandler from "@/pages/api/root/auth/logout";

const mocks = vi.hoisted(() => ({
  loginRootAdmin: vi.fn(),
  recordAuditEvent: vi.fn(),
  clearRootSessionCookie: vi.fn(),
  getRootTokenFromRequest: vi.fn(),
  parseRootSession: vi.fn(),
  revokeRootSession: vi.fn(),
}));

vi.mock("@/features/root-auth/services/root-auth-service", () => ({
  loginRootAdmin: mocks.loginRootAdmin,
}));

vi.mock("@/features/audit/services/audit-event-service", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

vi.mock("@/features/root-auth/services/root-session-service", () => ({
  clearRootSessionCookie: mocks.clearRootSessionCookie,
  getRootTokenFromRequest: mocks.getRootTokenFromRequest,
  parseRootSession: mocks.parseRootSession,
  revokeRootSession: mocks.revokeRootSession,
}));

function request(input?: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  return {
    method: input?.method ?? "POST",
    body: input?.body,
    headers: {
      host: "support.example.com",
      "x-forwarded-proto": "https",
      origin: "https://support.example.com",
      ...(input?.headers ?? {}),
    },
  } as never;
}

function response() {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as never;
}

describe("Root Admin auth route origin protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects cross-origin login before checking credentials", async () => {
    const res = response();

    await loginHandler(
      request({
        body: { username: "root", password: "secret" },
        headers: { origin: "https://evil.example" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid request origin" });
    expect(mocks.loginRootAdmin).not.toHaveBeenCalled();
  });

  it("rejects cross-origin logout before reading or revoking the session", async () => {
    const res = response();

    await logoutHandler(
      request({ headers: { origin: "https://evil.example" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid request origin" });
    expect(mocks.getRootTokenFromRequest).not.toHaveBeenCalled();
    expect(mocks.revokeRootSession).not.toHaveBeenCalled();
    expect(mocks.clearRootSessionCookie).not.toHaveBeenCalled();
  });
});
