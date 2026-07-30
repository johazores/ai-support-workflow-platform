# Contributing

Thank you for helping improve the AI Support Workflow Platform.

## Setup

```bash
npm install
cp .env.example .env
npm run db:setup
npm run root:bootstrap
npm run dev
```

Use local or disposable databases and provider credentials created specifically for development.

## Development principles

- Keep feature components, services, types, and tests together.
- Keep Prisma access inside server-side service and infrastructure boundaries.
- Preserve tenant isolation and permission checks at API and service boundaries.
- Keep product authentication, legacy development authentication, and Root Admin authentication separate.
- Keep administrator-managed runtime settings database-backed.
- Encrypt provider and mailbox credentials.
- Preserve durable workflow execution and idempotency.
- Do not add or modify GitHub Actions without a separate workflow and cost review.

## Branches and commits

Use `feat/<feature-name>` branches and focused Conventional Commits.

## Validation

```bash
npm run prisma:validate
npm run audit:api-boundaries
npm run type-check
npm run lint
npm run format:check
npm test
npm run build
```

## Pull requests

Include what changed, why it changed, testing performed, configuration or security impact, and breaking changes.
