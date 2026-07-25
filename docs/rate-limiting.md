# Request Rate Limiting

The platform applies server-side fixed-window rate limits to cookie-authenticated tenant and Root Admin APIs.

## Enforcement boundaries

### Tenant product APIs

`createTenantApiRoute()` applies rate limiting after tenant authentication and before request parsing/business logic.

Default classes:

- `GET` -> `read`
- `POST`, `PUT`, `PATCH`, `DELETE` -> `write`

A route can explicitly use the stricter `sensitive` class. Dedicated non-browser boundaries can opt out only when they provide their own purpose-built abuse protection.

Tenant limits are evaluated across three dimensions at the same time:

- request IP;
- authenticated user identity;
- organization.

The request is rejected when any active dimension exceeds its limit.

### Root Admin APIs

Authenticated Root Admin APIs use the same limiter with IP and Root Admin identity dimensions.

Root Admin login uses the `sensitive` IP limit before credential verification. This complements, rather than replaces, the existing per-account failed-login lockout.

## Default policies

| Class | Window | IP | Identity | Organization |
| --- | ---: | ---: | ---: | ---: |
| read | 1 minute | 600 | 300 | 3,000 |
| write | 1 minute | 180 | 90 | 900 |
| sensitive | 15 minutes | 30 | 20 | 120 |

These defaults are intentionally conservative enough for normal support workflows while limiting obvious bursts. A later Root Admin configuration increment can move these policy values into database-managed settings without changing the enforcement boundary.

## Storage and privacy

Rate-limit buckets are stored in MongoDB through atomic `findAndModify` increments in the `RateLimitBucket` collection.

The bucket key contains a SHA-256 digest of the rate-limit class, dimension, subject, and fixed-window start. Raw IP addresses, user IDs, and organization IDs are not stored in the bucket documents.

Expired buckets are cleaned opportunistically at most once per application process per hour.

## Failure behavior

Rate limiting fails closed on protected application boundaries. If the rate-limit datastore cannot be evaluated, protected tenant and Root Admin APIs return `503` rather than silently bypassing abuse controls.

Exceeded requests return `429` and include:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After`

## Proxy requirements

IP-based enforcement relies on the hosting/proxy layer normalizing `X-Forwarded-For` or `X-Real-IP`. The application falls back to the socket remote address when those headers are absent.

## Remaining dedicated boundaries

Browser API rate limiting does not replace endpoint-specific controls for signed webhooks, public endpoints, uploads, or future service/API-key traffic. Those surfaces must define their own limits and replay/size/signature controls appropriate to their threat model.
