import { describe, it, expect, vi, afterEach } from "vitest";
import { cn, formatDateTime, formatRelativeTime } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns empty string when all falsy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("formatDateTime", () => {
  it("formats an ISO string into a readable date", () => {
    const result = formatDateTime("2026-04-29T10:30:00.000Z");
    expect(result).toContain("Apr");
    expect(result).toContain("29");
    expect(result).toContain("2026");
  });
});

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for recent timestamps', () => {
    const now = new Date("2026-04-29T12:00:00Z");
    vi.setSystemTime(now);
    expect(formatRelativeTime("2026-04-29T11:59:30Z")).toBe("just now");
  });

  it("returns minutes ago", () => {
    const now = new Date("2026-04-29T12:00:00Z");
    vi.setSystemTime(now);
    expect(formatRelativeTime("2026-04-29T11:55:00Z")).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const now = new Date("2026-04-29T12:00:00Z");
    vi.setSystemTime(now);
    expect(formatRelativeTime("2026-04-29T09:00:00Z")).toBe("3h ago");
  });

  it("returns days ago", () => {
    const now = new Date("2026-04-29T12:00:00Z");
    vi.setSystemTime(now);
    expect(formatRelativeTime("2026-04-26T12:00:00Z")).toBe("3d ago");
  });
});
