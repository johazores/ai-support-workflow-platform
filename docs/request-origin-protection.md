# Tenant Product Mutation Origin Protection

State-changing tenant product APIs using `createTenantApiRoute()` require a same-origin browser request before product authentication is evaluated.

Protected methods:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Read-only `GET` routes are not subject to this mutation-origin check.

## Why this exists

Product authentication is cookie/session based. Even with secure and SameSite cookie settings, state-changing routes should not rely on cookie policy alone for CSRF protection.

The shared tenant route boundary therefore validates the request origin once for every standardized mutation instead of requiring each feature route to implement its own check.

## Accepted origins

The validator builds a small allowlist from:

1. `NEXT_PUBLIC_APP_URL`, when it is configured with a valid absolute URL;
2. the current trusted application host derived from `X-Forwarded-Host`/`Host` and `X-Forwarded-Proto`.

The request must provide either:

- a matching `Origin` header; or
- when `Origin` is absent, a matching `Referer` origin.

Malformed values, `Origin: null`, cross-site origins, and requests with neither Origin nor Referer fail closed.

## Proxy expectations

Production hosting must preserve the real application host and protocol in the standard forwarded headers. The platform should run only behind infrastructure where those headers are normalized by a trusted proxy/hosting layer.

`NEXT_PUBLIC_APP_URL` is recommended in production so the canonical application origin is explicit even when internal routing hosts differ.

## Server-to-server access

Do not bypass this protection by accepting missing Origin headers on the browser product API.

Future server-to-server integrations/API keys should use a distinct authenticated API boundary with:

- dedicated API-key/service identity authentication;
- tenant binding;
- scopes/permissions;
- rate limiting;
- replay protection where appropriate;
- no dependency on browser cookies.

## Dedicated boundaries

This tenant wrapper does not govern:

- Clerk-signed lifecycle webhooks;
- raw-body HMAC inbound email webhooks;
- independent Root Admin APIs;
- intentionally public health/readiness routes.

Those surfaces require their own appropriate CSRF/signature/origin policy.
