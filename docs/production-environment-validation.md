# Production Environment Validation

`scripts/validate-production-environment.mjs` validates the minimal production bootstrap environment without printing secret values.

Run it in the deployment environment before starting or promoting the application:

```bash
NODE_ENV=production node scripts/validate-production-environment.mjs
```

The command exits with status 1 when required bootstrap configuration is missing or unsafe.

## Required checks

The validator checks:

- MongoDB `DATABASE_URL` exists and uses a MongoDB connection string;
- Clerk publishable, secret, and webhook signing keys exist;
- `ROOT_SESSION_SECRET` is at least 32 characters;
- `CONFIG_ENCRYPTION_KEY` decodes to exactly 32 bytes.

Runtime application configuration is intentionally not validated from environment variables. AI providers, models, webhook signing, feature toggles, provider URLs, and other administrator-managed values are stored in the database and managed through Root Admin.

Use the Root Admin provider connection tests and system health screens to validate database-managed configuration after deployment.

## Warnings

The validator warns, but does not fail, when migration/bootstrap-only values remain present:

- `SESSION_SECRET` — temporary product-session signing during a controlled legacy-auth migration. The migration itself is enabled with database setting `auth.allow_legacy_product_auth`;
- `ROOT_ADMIN_PASSWORD` — bootstrap credential that should be removed from the steady-state runtime environment where operationally possible.

## Secret handling

Only variable names and validation messages are emitted. Credentials, tokens, connection strings, encryption keys, and passwords are never printed.

Use this validator together with the source Quality Gate, Root Admin configuration checks, and deployed production smoke tests. These checks cover different failure classes: build correctness, bootstrap safety, database-managed runtime configuration, and deployed network/application behavior.

See [runtime-configuration.md](runtime-configuration.md) for the full configuration ownership and migration contract.
