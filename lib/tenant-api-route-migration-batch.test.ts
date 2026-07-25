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
  "pages/api/customers/index.ts",
  "pages/api/customers/[id].ts",
  "pages/api/saved-replies/index.ts",
  "pages/api/saved-replies/[id].ts",
  "pages/api/tickets/index.ts",
  "pages/api/tickets/[ticket-id]/notes.ts",
  "pages/api/tickets/[ticket-id]/reply.ts",
  "pages/api/tickets/[ticket-id]/events.ts",
  "pages/api/ai-drafts/generate.ts",
  "pages/api/ai-drafts/save.ts",
  "pages/api/ai-drafts/[draft-id]/send.ts",
  "pages/api/tags/index.ts",
  "pages/api/email-config/index.ts",
  "pages/api/email-config/[id].ts",
  "pages/api/workflows/index.ts",
  "pages/api/workflows/[workflow-id]/index.ts",
  "pages/api/workflows/[workflow-id]/status.ts",
  "pages/api/tickets/[ticket-id]/workflows/run.ts",
  "pages/api/organization-invitations/index.ts",
  "pages/api/organization-invitations/[id].ts",
] as const;

describe("protected tenant API migration batch", () => {
  it.each(migratedRoutes)("keeps %s on createTenantApiRoute", (path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");

    expect(source).toContain("createTenantApiRoute");
    expect(source).not.toContain("requireTenantApiPermission(");
    expect(source).not.toContain("requireApiPermission(");
    expect(source).not.toContain("parseSessionValue(");
  });

  it("keeps the legacy create URL as a compatibility alias", () => {
    const source = readFileSync(
      join(process.cwd(), "pages/api/workflows/create.ts"),
      "utf8",
    );

    expect(source.trim()).toBe(
      'export { default } from "@/pages/api/workflows/index";',
    );
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
