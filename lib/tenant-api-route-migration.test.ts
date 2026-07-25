import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const standardizedRoutes = [
  "pages/api/workflow-definitions/index.ts",
  "pages/api/workflow-definitions/[id].ts",
  "pages/api/workflow-definitions/[id]/publish.ts",
  "pages/api/workflow-definitions/[id]/run.ts",
  "pages/api/workflow-definitions/[id]/test.ts",
  "pages/api/workflow-definitions/[id]/versions.ts",
  "pages/api/workflow-definitions/options.ts",
  "pages/api/tickets/[ticket-id]/status.ts",
  "pages/api/tickets/[ticket-id]/priority.ts",
  "pages/api/tickets/[ticket-id]/assign.ts",
  "pages/api/tickets/[ticket-id]/tags.ts",
] as const;

describe("standardized tenant API migration", () => {
  it.each(standardizedRoutes)("routes %s through createTenantApiRoute", (path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");

    expect(source).toContain("createTenantApiRoute");
    expect(source).not.toContain("requireTenantApiPermission(");
    expect(source).not.toContain("requireApiPermission(");
  });
});
