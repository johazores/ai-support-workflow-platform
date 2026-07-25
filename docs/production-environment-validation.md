# Production Environment Validation

`scripts/validate-production-environment.mjs` validates production configuration without printing secret values.

Run it in the deployment environment before starting or promoting the application:

```bash
NODE_ENV=production node scripts/validate-production-environment.mjs
```

The command exits with status 1 when required production configuration is missing or unsafe.

## Required checks

The validator checks:

- MongoDB `DATABASE_URL` exists and uses a MongoDB connection string;
- Clerk publishable, secret, and webhook signing keys exist;
- `ROOT_SESSION_SECRET` is at least 32 characters;
- `CONFIG_ENCRYPTION_KEY` decodes to exactly 32 bytes;
- inbound `WEBHOOK_SECRET` is present and has a minimum length;
- `NEXT_PUBLIC_APP_URL` or `APP_URL` is a valid HTTPS production URL;
- `ALLOW_LEGACY_PRODUCT_AUTH` is not enabled;
- `ALLOW_MOCK_AI` is not enabled.

## Warnings

The validator warns, but does not fail, when migration/bootstrap-only values remain present:

- `SESSION_SECRET` — historical product-session migration only;
- `ROOT_ADMIN_PASSWORD` — bootstrap credential that should be removed from the steady-state runtime environment where operationally possible.

## Secret handling

Only variable names and validation messages are emitted. Credentials, tokens, connection strings, encryption keys, and passwords are never printed.

Use this validator together with the source Quality Gate and the deployed production smoke tests. The three checks cover different failure classes: build correctness, environment safety, and deployed network/application behavior.
