# Authentication Modes

The platform intentionally has two independent authentication boundaries.

## Product users

Clerk is the production identity provider for product users. Product pages and protected APIs resolve the Clerk session, map it to the internal `User` record, then resolve the active `OrganizationMember` membership before applying role permissions.

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
- `/root/login` and Root Admin authorization helpers.

Disabling legacy product authentication must never disable Root Admin access.

## Environment expectations

### Production

- Configure Clerk product credentials.
- Leave `ALLOW_LEGACY_PRODUCT_AUTH=false` or unset.
- Configure the independent Root Admin bootstrap/session secrets.
- Never rely on seeded product passwords.

### Local migration/development

To exercise historical seeded accounts temporarily:

```env
ALLOW_LEGACY_PRODUCT_AUTH="true"
SESSION_SECRET="development-only-secret-at-least-32-characters"
```

This mode is intentionally unavailable when `NODE_ENV=production`.
