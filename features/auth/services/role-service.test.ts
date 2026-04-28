import { describe, it, expect } from "vitest";
import {
  hasPermission,
  getPermissions,
  isElevatedRole,
} from "@/features/auth/services/role-service";

describe("role-service", () => {
  describe("hasPermission", () => {
    it("grants admin all permissions", () => {
      expect(hasPermission("admin", "tickets:read")).toBe(true);
      expect(hasPermission("admin", "workflows:manage")).toBe(true);
      expect(hasPermission("admin", "users:manage")).toBe(true);
      expect(hasPermission("admin", "audit-logs:read")).toBe(true);
    });

    it("grants supervisor read/manage subset but not users:manage", () => {
      expect(hasPermission("supervisor", "tickets:read")).toBe(true);
      expect(hasPermission("supervisor", "analytics:read")).toBe(true);
      expect(hasPermission("supervisor", "audit-logs:read")).toBe(true);
      expect(hasPermission("supervisor", "users:manage")).toBe(false);
      expect(hasPermission("supervisor", "workflows:manage")).toBe(false);
    });

    it("grants agent basic ticket permissions only", () => {
      expect(hasPermission("agent", "tickets:read")).toBe(true);
      expect(hasPermission("agent", "tickets:assign")).toBe(true);
      expect(hasPermission("agent", "saved-replies:read")).toBe(true);
      expect(hasPermission("agent", "workflows:manage")).toBe(false);
      expect(hasPermission("agent", "analytics:read")).toBe(false);
      expect(hasPermission("agent", "users:manage")).toBe(false);
    });

    it("denies unknown roles all permissions", () => {
      expect(hasPermission("unknown", "tickets:read")).toBe(false);
      expect(hasPermission("", "tickets:read")).toBe(false);
    });
  });

  describe("getPermissions", () => {
    it("returns all permissions for admin", () => {
      const perms = getPermissions("admin");
      expect(perms.length).toBeGreaterThan(0);
      expect(perms).toContain("users:manage");
    });

    it("returns empty array for unknown role", () => {
      expect(getPermissions("hacker")).toEqual([]);
    });
  });

  describe("isElevatedRole", () => {
    it("returns true for admin and supervisor", () => {
      expect(isElevatedRole("admin")).toBe(true);
      expect(isElevatedRole("supervisor")).toBe(true);
    });

    it("returns false for agent and unknown", () => {
      expect(isElevatedRole("agent")).toBe(false);
      expect(isElevatedRole("unknown")).toBe(false);
    });
  });
});
