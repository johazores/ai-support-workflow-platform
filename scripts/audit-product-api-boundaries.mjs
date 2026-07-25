import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const apiRoot = join(root, "pages", "api");

const dedicatedBoundaryPrefixes = [
  "pages/api/root/",
  "pages/api/webhooks/",
  "pages/api/auth/",
];

const intentionallyPublicRoutes = new Set([
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

const directProductAuthMarkers = [
  "requireTenantApiPermission(",
  "requireApiPermission(",
  "requireApiAuth(",
  "parseSessionValue(",
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(path);
  }

  return files;
}

function normalized(path) {
  return relative(root, path).split(sep).join("/");
}

function isDedicatedBoundary(path) {
  return (
    dedicatedBoundaryPrefixes.some((prefix) => path.startsWith(prefix)) ||
    intentionallyPublicRoutes.has(path)
  );
}

const files = await walk(apiRoot);
const standardized = [];
const aliases = [];
const dedicated = [];
const direct = [];
const unclassified = [];

for (const file of files) {
  const path = normalized(file);
  const source = await readFile(file, "utf8");

  if (isDedicatedBoundary(path)) {
    dedicated.push(path);
    continue;
  }

  const alias = compatibilityAliases.get(path);
  if (alias && source.trim() === alias) {
    aliases.push(path);
    continue;
  }

  const directMarkers = directProductAuthMarkers.filter((marker) =>
    source.includes(marker),
  );
  if (directMarkers.length > 0) {
    direct.push({ path, markers: directMarkers });
    continue;
  }

  if (standardizedMarkers.some((marker) => source.includes(marker))) {
    standardized.push(path);
    continue;
  }

  unclassified.push(path);
}

console.log("Protected product API boundary audit\n");
console.log(`Standardized product routes: ${standardized.length}`);
console.log(`Compatibility aliases: ${aliases.length}`);
console.log(`Dedicated/public boundaries: ${dedicated.length}`);
console.log(`Direct product-auth regressions: ${direct.length}`);
console.log(`Unclassified routes: ${unclassified.length}\n`);

if (direct.length > 0) {
  console.log("Direct product-auth routes are not allowed:");
  for (const item of direct) {
    console.log(`- ${item.path}: ${item.markers.join(", ")}`);
  }
  console.log("");
}

if (unclassified.length > 0) {
  console.log("Unclassified routes requiring an explicit boundary:");
  for (const path of unclassified) console.log(`- ${path}`);
  console.log("");
}

if (direct.length > 0 || unclassified.length > 0) {
  process.exitCode = 2;
}
