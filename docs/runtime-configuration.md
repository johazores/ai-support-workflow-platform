# Runtime Configuration

The Root Admin CMS and the database are the single source of truth for application runtime configuration.

Administrator-managed values must not be added to deployment environment variables. Runtime services read their current values from the database so configuration changes can take effect without rebuilding or redeploying the application.

## Bootstrap environment variables

Environment variables are limited to values required before the application can safely read database configuration:

- `DATABASE_URL` — connects Prisma to MongoDB;
- `ROOT_SESSION_SECRET` — signs independent Root Admin sessions;
- `CONFIG_ENCRYPTION_KEY` — encrypts database-managed secrets;
- Clerk publishable, secret, and webhook keys — required by Clerk middleware and lifecycle webhooks during framework initialization;
- `SESSION_SECRET` — optional temporary signing key while legacy product authentication is being migrated;
- `ROOT_ADMIN_USERNAME`, `ROOT_ADMIN_PASSWORD`, and `ROOT_ADMIN_DISPLAY_NAME` — one-time bootstrap inputs for `npm run root:bootstrap`.

`NODE_ENV` remains a deployment/runtime mode supplied by the platform rather than an administrator setting.

Do not store AI credentials, AI models, webhook signing secrets, provider URLs, feature toggles, or similar runtime choices in the deployment environment.

## Root Admin system settings

Manage general runtime settings under **Root Admin → Settings**.

| Key | Category | Secret | Default | Purpose |
| --- | --- | --- | --- | --- |
| `email.inbound_webhook_secret` | `email` | Yes | Not configured | HMAC-SHA256 signing secret for `POST /api/webhooks/inbound-email`. |
| `ai.allow_mock_provider` | `ai` | No | `false` | Enables the mock AI provider outside production only. |
| `auth.allow_legacy_product_auth` | `auth` | No | `false` | Enables temporary legacy product login outside production only. |

Boolean values may be stored as JSON booleans (`true` or `false`). Production safety guards still prevent mock AI and legacy product authentication from being enabled in production.

Secret settings are encrypted with AES-256-GCM before storage and are never returned to the browser in plaintext.

## Provider configuration

Manage integrations under **Root Admin → Providers**.

For each AI provider, configure:

- enabled or disabled state;
- execution priority;
- encrypted credential;
- default model;
- optional base URL;
- optional provider-specific JSON configuration.

Only enabled database records participate in the AI fallback chain. A deployment environment variable cannot activate a provider, replace its credential, override its model, or change its priority.

Provider API endpoint defaults remain implementation constants. Administrators can override an endpoint with the provider's database-managed base URL when needed.

## Dynamic loading behavior

Runtime configuration is read from the database at the point it is used:

- AI provider policies are resolved for each draft-generation operation;
- provider credentials and models are loaded before each provider request;
- the inbound-email webhook secret is loaded for each webhook request;
- the legacy-auth migration toggle is loaded for each authentication decision;
- the mock-provider toggle is loaded whenever the AI provider chain is assembled.

This avoids stale process-level configuration and makes the Admin CMS authoritative without requiring application restarts.

## Migration from legacy environment variables

1. Configure every required provider in **Root Admin → Providers**.
2. Add `email.inbound_webhook_secret` as an encrypted Root Admin system setting.
3. Add any required non-production migration toggles as Root Admin system settings.
4. Test enabled provider connections from the provider management screen.
5. Remove legacy AI keys, AI model variables, `WEBHOOK_SECRET`, `ALLOW_MOCK_AI`, and `ALLOW_LEGACY_PRODUCT_AUTH` from the deployment environment.
6. Run the production environment validator to confirm that only bootstrap configuration remains.

After migration, missing database configuration fails closed: providers remain disabled, unsigned webhooks are rejected, and migration-only authentication stays unavailable.
