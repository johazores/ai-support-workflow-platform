# Browser Mutation Origin Protection

Cookie-authenticated browser mutations must prove that they originated from the application itself before authentication or business logic runs.

## Tenant product APIs

Routes using `createTenantApiRoute()` automatically reject unsafe mutation methods (`POST`, `PUT`, `PATCH`, and `DELETE`) unless the request `Origin` or fallback `Referer` matches a trusted application origin.

Trusted origins are derived from:

- `NEXT_PUBLIC_APP_URL` when configured;
- the request host or forwarded host;
- the forwarded protocol, with secure production defaults.

Safe `GET` reads do not require an Origin header.

## Root Admin APIs

Authenticated Root Admin mutations use the same origin policy through `requireRootApiAuth()`.

The Root Admin login and logout endpoints also enforce the origin check directly because they execute before or outside the authenticated Root Admin API helper.

## Fail-closed behavior

Mutation requests are rejected with HTTP `403` when:

- `Origin` is cross-site;
- `Origin` is `null` or malformed;
- neither `Origin` nor a usable `Referer` is present;
- no trusted request/application origin can be established.

## Proxy expectations

Production hosting must preserve the real application host and protocol in standard forwarded headers. `NEXT_PUBLIC_APP_URL` should be configured in production so the canonical public origin remains explicit even when internal routing hosts differ.

## Server-to-server access

Do not weaken this browser protection to accommodate server-to-server integrations. Future API-key or service-token access should use a separate authenticated boundary with tenant binding, explicit scopes, rate limiting, and replay protection where appropriate.

## Dedicated non-browser boundaries

This origin policy does not replace purpose-built authentication for:

- Clerk-signed lifecycle webhooks;
- raw-body HMAC inbound email webhooks;
- intentionally public health/readiness routes.

Those surfaces keep their own signature, replay, or public-endpoint controls.
