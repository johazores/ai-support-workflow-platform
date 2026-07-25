import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const apiRoot = join(root, "pages", "api");

const dedicatedBoundaryPrefixes = [
  "pages/api/root/",
  "pages/api/webhooks/",
];

const intentionallyPublicRoutes = new Set([
  "pages/api/health.ts",
  "pages/api/readiness.ts",
]);

const standardizedMarker = "createTenantApiRoute";
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
const migrated = [];
const dedicated = [];
const remaining = [];
const unclassified = [];

for (const file of files) {
  const path = normalized(file);
  const source = await readFile(file, "utf8");

  if (isDedicatedBoundary(path)) {
    dedicated.push(path);
    continue;
  }

  if (source.includes(standardizedMarker)) {
    migrated.push(path);
    continue;
  }

  const directMarkers = directProductAuthMarkers.filter((marker) =>
    source.includes(marker),
  );
  if (directMarkers.length > 0) {
    remaining.push({ path, markers: directMarkers });
    continue;
  }

  unclassified.push(path);
}

console.log("Protected product API boundary audit\n");
console.log(`Standardized tenant routes: ${migrated.length}`);
console.log(`Dedicated/public boundaries: ${dedicated.length}`);
console.log(`Direct product-auth routes remaining: ${remaining.length}`);
console.log(`Unclassified routes: ${unclassified.length}\n`);

if (remaining.length > 0) {
  console.log("Direct product-auth routes remaining:");
  for (const item of remaining) {
    console.log(`- ${item.path}: ${item.markers.join(", ")}`);
  }
  console.log("");
}

if (unclassified.length > 0) {
  console.log("Unclassified routes requiring review:");
  for (const path of unclassified) console.log(`- ${path}`);
  console.log("");
}

// This is an inventory tool while migration is active. It deliberately does not
// fail the process for remaining routes until the repository-wide conversion is
// complete; unclassified routes always require explicit review.
if (unclassified.length > 0) process.exitCode = 2;
