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
] as const;

describe("protected tenant API migration batch", () => {
  it.each(migratedRoutes)("keeps %s on createTenantApiRoute", (path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");

    expect(source).toContain("createTenantApiRoute");
    expect(source).not.toContain("requireTenantApiPermission(");
    expect(source).not.toContain("requireApiPermission(");
    expect(source).not.toContain("parseSessionValue(");
  });
});
