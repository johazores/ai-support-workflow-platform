# Security Policy

## Reporting

Do not open a public issue for vulnerabilities involving tenant isolation, authentication, Root Admin access, mailbox credentials, provider secrets, inbound webhook signing, workflow execution, or customer data exposure.

Contact the maintainer through the GitHub profile with a sanitized reproduction, affected route or feature, expected behavior, actual behavior, and potential impact.

## Security boundaries

- Product authentication uses Clerk as the primary identity provider.
- Root Admin uses an independent authentication and session boundary.
- Legacy product authentication is development-only and must remain disabled in production.
- Provider, mailbox, and secret-class runtime values are encrypted before database storage.
- Tenant-owned records must be scoped at API and service boundaries.
- Inbound webhooks require a database-managed signing secret.

## Production requirements

- Use strong unique bootstrap and encryption secrets.
- Disable mock providers and legacy authentication.
- Remove temporary bootstrap credentials.
- Use restricted mailbox and provider accounts.
- Review audit logs and provider failure logs.
- Validate the production environment before deployment.
- Never include customer conversations, credentials, or private email content in public reports.
