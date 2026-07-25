import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const apiRoot = join(root, "pages", "api");

const explicitBoundaryPrefixes = [
  "pages/api/root/",
  "pages/api/webhooks/",
  "pages/api/auth/",
];

const intentionallyPublic = new Set([
  "pages/api/health.ts",
  "pages/api/readiness.ts",
]);

const productSecurityMarkers = [
  "createTenantApiRoute(",
  "requireTenantApiPermission(",
  "requireApiPermission(",
  "requireApiAuth(",
  "parseSessionValue(",
];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function normalized(path: string) {
  return relative(root, path).split(sep).join("/");
}

function hasExplicitDedicatedBoundary(path: string) {
  return (
    intentionallyPublic.has(path) ||
    explicitBoundaryPrefixes.some((prefix) => path.startsWith(prefix))
  );
}

describe("Pages API security boundary inventory", () => {
  const routeFiles = walk(apiRoot).filter((path) => /\.(ts|tsx|js|mjs)$/.test(path));

  it("finds API routes to audit", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it.each(routeFiles)("classifies %s under an explicit security boundary", (file) => {
    const path = normalized(file);
    if (hasExplicitDedicatedBoundary(path)) return;

    const source = readFileSync(file, "utf8");
    const hasProductBoundary = productSecurityMarkers.some((marker) =>
      source.includes(marker),
    );

    expect(
      hasProductBoundary,
      `${path} has no recognized product authentication/authorization boundary. ` +
        "Use createTenantApiRoute() for protected product APIs or document an intentional dedicated/public boundary.",
    ).toBe(true);
  });
});
