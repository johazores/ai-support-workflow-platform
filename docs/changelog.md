# Changelog

Notable project and repository changes are documented here.

## Unreleased

### Added

- MIT licensing and public contribution, security, roadmap, conduct, metadata, and authentication documentation.

### Changed

- Clarified the separation between Clerk product authentication, development-only legacy authentication, and independent Root Admin sessions.
- Made database-managed runtime configuration authoritative for administrator-managed settings.

## 0.3.0

### Added

- Multi-mailbox SMTP and IMAP support.
- AI draft provider fallback and provider administration.
- Durable workflow definitions, executions, and step records.
- Tenant roles and permissions.
- Root Admin runtime configuration and system health controls.
- API-boundary auditing, Vitest coverage, Docker support, and production operations documentation.

### Security

- Encrypted database configuration for provider and mailbox secrets.
- Signed inbound email webhook support.
- Production environment validation and explicit mock-provider restrictions.
