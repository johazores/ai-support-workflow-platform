# Authentication Modes

The platform intentionally has two independent authentication boundaries.

## Product users

Clerk is the production identity provider for product users. Product pages and protected APIs resolve the Clerk session and map it to the internal `User` record.

Production product API authentication is fail-closed:

- when Clerk is configured, `requireApiAuth()` accepts Clerk only;
- a failed Clerk lookup never falls back to the historical `support_session` cookie;
- the legacy product cookie is accepted only when Clerk is absent and the explicit non-production migration gate is enabled.

Product APIs then use one of two standardized wrappers:

### Tenant product APIs

`createTenantApiRoute()` is used after an active organization can be resolved. It resolves the active `OrganizationMember`, applies the membership role/permission, and adds request IDs, same-origin mutation checks, tenant-aware rate limits, validation, and normalized errors.

Internal `Organization` and `OrganizationMember` records remain the tenancy and authorization source of truth. Clerk Organizations are not introduced as a second tenant model.

### Pre-tenant product identity APIs

`createProductIdentityApiRoute()` is used only for flows that must work before an active organization exists or while it is being selected, including:

- listing the authenticated user's organizations;
- selecting an active organization;
- creating the first organization during Clerk onboarding.

This boundary still requires authenticated product identity and applies request IDs, same-origin mutation checks, IP/identity rate limits, validation, and normalized errors, but it does not invent or require an active tenant before the operation itself establishes one.

The historical local email/password product login is migration tooling only. It is available only when both conditions are true:

- the runtime is not `production`;
- `ALLOW_LEGACY_PRODUCT_AUTH=true` is set explicitly.

Production ignores the flag and never accepts the legacy product cookie as authentication. When Clerk is not configured and the migration gate is off, `/login` explains that product authentication is unavailable instead of rendering the password form, and `/api/auth/login` rejects the request.

`SESSION_SECRET` remains necessary only while this development migration path exists. It must be removed from the production product-auth architecture once seeded/local password compatibility is deleted completely.

## Root Admin

Root Admin authentication is separate from Clerk and separate from the legacy product session. It uses:

- `RootAdmin` records;
- the dedicated Root Admin password hash;
- `RootSession` revocation records;
- `ROOT_SESSION_SECRET`;
- a separate Root Admin cookie/audience;
- `/root/login` and Root Admin authorization helpers;
- same-origin checks and Root-specific rate limiting on browser API mutations.

Disabling legacy product authentication must never disable Root Admin access.

## Environment expectations

### Production

- Configure Clerk product credentials.
- Leave `ALLOW_LEGACY_PRODUCT_AUTH=false` or unset.
- Configure the independent Root Admin bootstrap/session secrets.
- Never rely on seeded product passwords or `support_session` fallback.

### Local migration/development

To exercise historical seeded accounts temporarily:

```env
ALLOW_LEGACY_PRODUCT_AUTH="true"
SESSION_SECRET="development-only-secret-at-least-32-characters"
```

This mode is intentionally unavailable when `NODE_ENV=production`.
