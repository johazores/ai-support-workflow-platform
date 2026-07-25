# Production Smoke Tests

`scripts/production-smoke-test.mjs` provides a non-destructive deployment smoke test that can run from a developer machine, deployment job, or external release runner.

## Usage

```bash
node scripts/production-smoke-test.mjs --base-url https://support.example.com
```

Or:

```bash
BASE_URL=https://support.example.com node scripts/production-smoke-test.mjs
```

Use `--json` for machine-readable output.

## Checks

The runner verifies:

- `/api/health` is reachable;
- `/api/readiness` is ready;
- a protected tenant API rejects anonymous access and returns a request ID;
- a Root Admin API rejects anonymous access;
- a product mutation rejects a cross-origin request before authentication;
- Root Admin login rejects a cross-origin request before credential verification;
- the deployed application emits baseline security response headers.

The mutation checks intentionally use a hostile Origin and unauthenticated dummy data so they are rejected before any application state can change.

## Release gate

Run the smoke test after deployment and before considering a release healthy. Any failed check exits with status 1.

This script complements, rather than replaces, the repository Quality Gate. CI validates source correctness and production buildability; the smoke runner validates the deployed network/application boundary.

## Future expansion

Authenticated tenant and Root Admin smoke flows should be added only when the deployment environment can supply short-lived test identities safely. Do not embed production credentials or long-lived tokens in this script.
