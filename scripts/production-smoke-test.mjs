import process from "node:process";

const DEFAULT_TIMEOUT_MS = 10_000;

function parseArgs(argv) {
  const args = { baseUrl: process.env.BASE_URL || "", json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json") args.json = true;
    if (value === "--base-url") args.baseUrl = argv[index + 1] || "";
  }

  if (!args.baseUrl) {
    throw new Error(
      "Missing deployment URL. Pass --base-url https://app.example.com or set BASE_URL.",
    );
  }

  const url = new URL(args.baseUrl);
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Deployment URL must use http or https.");
  }

  return { ...args, baseUrl: url.origin };
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      redirect: "manual",
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function expectedStatus(...statuses) {
  return (response) =>
    statuses.includes(response.status)
      ? null
      : `expected HTTP ${statuses.join(" or ")}, received ${response.status}`;
}

function requiredHeader(name, expectedValue) {
  return (response) => {
    const value = response.headers.get(name);
    if (!value) return `missing ${name} header`;
    if (expectedValue && value.toLowerCase() !== expectedValue.toLowerCase()) {
      return `${name} expected ${expectedValue}, received ${value}`;
    }
    return null;
  };
}

function requestIdHeader(response) {
  const value = response.headers.get("x-request-id");
  return value && value.length >= 8 ? null : "missing or invalid X-Request-ID header";
}

const checks = [
  {
    name: "health endpoint",
    path: "/api/health",
    validate: [expectedStatus(200)],
  },
  {
    name: "readiness endpoint",
    path: "/api/readiness",
    validate: [expectedStatus(200)],
  },
  {
    name: "tenant API rejects anonymous access",
    path: "/api/tickets",
    validate: [expectedStatus(401), requestIdHeader],
  },
  {
    name: "Root Admin API rejects anonymous access",
    path: "/api/root/providers",
    validate: [expectedStatus(401)],
  },
  {
    name: "product mutation rejects cross-origin requests before auth",
    path: "/api/organizations/select",
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://cross-origin.invalid",
      },
      body: JSON.stringify({ organizationId: "smoke-test" }),
    },
    validate: [expectedStatus(403), requestIdHeader],
  },
  {
    name: "Root login rejects cross-origin requests",
    path: "/api/root/auth/login",
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://cross-origin.invalid",
      },
      body: JSON.stringify({ username: "smoke-test", password: "smoke-test" }),
    },
    validate: [expectedStatus(403)],
  },
  {
    name: "security response headers",
    path: "/root/login",
    validate: [
      expectedStatus(200, 301, 302, 307, 308),
      requiredHeader("x-content-type-options", "nosniff"),
      requiredHeader("referrer-policy"),
    ],
  },
];

async function runCheck(baseUrl, check) {
  const startedAt = Date.now();

  try {
    const response = await fetchWithTimeout(`${baseUrl}${check.path}`, check.init);
    const failures = check.validate
      .map((validate) => validate(response))
      .filter(Boolean);

    return {
      name: check.name,
      path: check.path,
      ok: failures.length === 0,
      status: response.status,
      durationMs: Date.now() - startedAt,
      failures,
    };
  } catch (error) {
    return {
      name: check.name,
      path: check.path,
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      failures: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = [];

  for (const check of checks) {
    results.push(await runCheck(args.baseUrl, check));
  }

  const failed = results.filter((result) => !result.ok);
  const summary = {
    baseUrl: args.baseUrl,
    checkedAt: new Date().toISOString(),
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Production smoke test: ${args.baseUrl}\n`);
    for (const result of results) {
      const marker = result.ok ? "PASS" : "FAIL";
      console.log(
        `${marker.padEnd(4)} ${result.name} (${result.status ?? "error"}, ${result.durationMs}ms)`,
      );
      for (const failure of result.failures) console.log(`     - ${failure}`);
    }
    console.log(`\n${summary.passed} passed, ${summary.failed} failed.`);
  }

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
