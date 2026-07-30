# Authentication Architecture

The platform has separate authentication boundaries for product users and platform administration.

## Product authentication

Clerk is the primary product identity provider.

Product sessions are resolved into local application users, organizations, roles, and permissions. The local database remains authoritative for tenant membership, authorization, and application-owned profile data.

Product API routes must establish authenticated user and tenant context before calling feature services.

## Root Admin authentication

Root Admin uses an independent authentication and session system.

Root Admin sessions do not reuse product-user roles or Clerk sessions. This boundary protects platform-wide provider settings, runtime configuration, audit logs, health controls, and organization administration.

## Legacy development authentication

Legacy seeded accounts are available only when the database-managed `auth.allow_legacy_product_auth` setting is enabled outside production.

Legacy authentication must be disabled in production and must not be described as the primary product authentication path.

## Session security

- Use HttpOnly cookies where browser sessions are used.
- Use secure cookie behavior in production.
- Validate tenant and permission context on every protected API request.
- Keep Root Admin and product session secrets separate.
- Rotate bootstrap credentials after initial provisioning.
- Do not expose provider tokens or session payloads to the browser unnecessarily.

## Authorization

Roles and permissions are application-owned. Identity verification alone does not grant access to an organization or feature.

API routes and server-side page guards must enforce the same permission contract. UI visibility is a usability layer and is not a replacement for server-side authorization.
