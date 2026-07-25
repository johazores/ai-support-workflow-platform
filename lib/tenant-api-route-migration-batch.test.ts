import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migratedRoutes = [
  "pages/api/analytics/index.ts",
  "pages/api/email-logs/index.ts",
  "pages/api/email-templates/index.ts",
  "pages/api/email-templates/[id].ts",
  "pages/api/email/poll.ts",
  "pages/api/notifications/index.ts",
  "pages/api/csat/[ticket-id].ts",
  "pages/api/csat/stats.ts",
  "pages/api/users/index.ts",
  "pages/api/users/[id].ts",
  "pages/api/sla-policies/index.ts",
  "pages/api/sla-policies/[id].ts",
  "pages/api/tickets/[ticket-id]/sla.ts",
  "pages/api/tickets/bulk.ts",
] as const;

describe("protected tenant API migration batch", () => {
  it.each(migratedRoutes)("keeps %s on createTenantApiRoute", (path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");

    expect(source).toContain("createTenantApiRoute");
    expect(source).not.toContain("requireTenantApiPermission(");
    expect(source).not.toContain("requireApiPermission(");
    expect(source).not.toContain("parseSessionValue(");
  });

  it("keeps direct password-based team creation development-gated", () => {
    const source = readFileSync(
      join(process.cwd(), "pages/api/users/index.ts"),
      "utf8",
    );

    expect(source).toContain("isLegacyProductAuthEnabled()");
    expect(source).toContain("Use organization invitations");
  });
});
