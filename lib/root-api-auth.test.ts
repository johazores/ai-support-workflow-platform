import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireRootApiAuth } from "@/lib/root-api-auth";

const mocks = vi.hoisted(() => ({
  getRootTokenFromRequest: vi.fn(),
  parseRootSession: vi.fn(),
}));

vi.mock("@/features/root-auth/services/root-session-service", () => ({
  getRootTokenFromRequest: mocks.getRootTokenFromRequest,
  parseRootSession: mocks.parseRootSession,
}));

function request(input?: {
  method?: string;
  headers?: Record<string, string>;
}) {
  return {
    method: input?.method ?? "GET",
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
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as never;
}

describe("requireRootApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRootTokenFromRequest.mockReturnValue("token");
    mocks.parseRootSession.mockResolvedValue({
      id: "root-1",
      username: "root",
      displayName: "Root Admin",
      tokenId: "token-id",
    });
  });

  it("rejects a cross-origin root mutation before session parsing", async () => {
    const res = response();

    const result = await requireRootApiAuth(
      request({
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
      res,
    );

    expect(result).toEqual({ ok: false, rootAdmin: null });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid request origin" });
    expect(mocks.getRootTokenFromRequest).not.toHaveBeenCalled();
    expect(mocks.parseRootSession).not.toHaveBeenCalled();
  });

  it("allows a same-origin mutation to continue through root authentication", async () => {
    const req = request({ method: "PATCH" });
    const res = response();

    const result = await requireRootApiAuth(req, res);

    expect(mocks.getRootTokenFromRequest).toHaveBeenCalledWith(req);
    expect(mocks.parseRootSession).toHaveBeenCalledWith("token");
    expect(result).toEqual({
      ok: true,
      rootAdmin: {
        id: "root-1",
        username: "root",
        displayName: "Root Admin",
        tokenId: "token-id",
      },
    });
  });

  it("does not require an Origin header for safe GET reads", async () => {
    const req = request({
      method: "GET",
      headers: { origin: "" },
    });
    const res = response();

    const result = await requireRootApiAuth(req, res);

    expect(result.ok).toBe(true);
    expect(mocks.parseRootSession).toHaveBeenCalledWith("token");
  });
});
