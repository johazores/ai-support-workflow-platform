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

const compatibilityAliases = new Map([
  [
    "pages/api/workflows/create.ts",
    'export { default } from "@/pages/api/workflows/index";',
  ],
]);

const standardizedMarkers = [
  "createTenantApiRoute(",
  "createProductIdentityApiRoute(",
];

const forbiddenDirectProductAuthMarkers = [
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
  const routeFiles = walk(apiRoot).filter((path) =>
    /\.(ts|tsx|js|mjs)$/.test(path),
  );

  it("finds API routes to audit", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it.each(routeFiles)("classifies %s under an explicit security boundary", (file) => {
    const path = normalized(file);
    if (hasExplicitDedicatedBoundary(path)) return;

    const source = readFileSync(file, "utf8");
    const alias = compatibilityAliases.get(path);
    if (alias) {
      expect(source.trim()).toBe(alias);
      return;
    }

    const directMarkers = forbiddenDirectProductAuthMarkers.filter((marker) =>
      source.includes(marker),
    );
    expect(
      directMarkers,
      `${path} still uses direct product auth: ${directMarkers.join(", ")}`,
    ).toEqual([]);

    const hasStandardBoundary = standardizedMarkers.some((marker) =>
      source.includes(marker),
    );
    expect(
      hasStandardBoundary,
      `${path} has no recognized standardized product API boundary. ` +
        "Use createTenantApiRoute() for tenant APIs or createProductIdentityApiRoute() before tenant selection.",
    ).toBe(true);
  });
});
