# Production Operations Runbook

This runbook covers deployment, rollback, backup/restore, and incident response for the AI Support Workflow Platform. It reflects the current architecture: Next.js, Prisma with MongoDB, Clerk product authentication, independent Root Admin sessions, encrypted database-managed integration credentials, tenant-owned support data, and workflow execution records.

The runbook intentionally does not assume a single hosting vendor. Hosting-specific commands may be added later, but the safety gates below apply to any production deployment.

## 1. Production ownership

Every production environment must have named owners for:

- application deployment and rollback;
- MongoDB backup/restore;
- Clerk configuration;
- Root Admin bootstrap/session secrets;
- configuration encryption master key custody;
- provider credential rotation;
- DNS/domain changes;
- incident coordination.

Never make a production change when the rollback owner, database owner, or encryption-key owner is unknown.

## 2. Bootstrap secrets

The application still requires a small trusted bootstrap outside the database:

- `DATABASE_URL`;
- Clerk server/publishable/webhook credentials for product authentication;
- `ROOT_SESSION_SECRET` and Root Admin bootstrap credentials where bootstrap is still required;
- `CONFIG_ENCRYPTION_KEY`;
- signed inbound-email webhook secret;
- hosting/runtime values required before the application can read database-managed configuration.

The legacy product session secret is development-migration compatibility only and must not be relied upon for production product authentication.

### Encryption-key warning

`CONFIG_ENCRYPTION_KEY` protects stored provider and mailbox secrets. Losing the key can make encrypted credentials unrecoverable. Replacing it without an intentional rotation/migration process can make existing ciphertext unreadable.

Back up encryption-key custody separately from the database. Never store the key inside the same database it decrypts.

## 3. Pre-deployment checklist

Do not deploy a change until all applicable checks are green.

### Source and review

- Confirm the intended pull request is approved and contains no unrelated files.
- Confirm the branch is based on the latest production branch.
- Confirm there are no unreviewed generated patches, temporary migration workflows, test credentials, or debug-only endpoints.
- Confirm `MASTER_IMPLEMENTATION_PLAN.md` and architecture documentation match behavior changed by the release.

### Quality gate

Run the repository quality gate from a clean checkout:

```bash
npm ci
npx prisma generate
npx prisma validate
npm run type-check -- --pretty false
npx eslint . --max-warnings 0
npm run format:check
npx vitest run --reporter=verbose
npx next build
```

A deployment is blocked if any command fails.

### Database and migration safety

Before schema/index changes:

1. Record the exact production commit currently deployed.
2. Confirm a recent restorable database backup exists.
3. Review Prisma schema changes for tenant-scoped uniqueness/index impact.
4. Check whether existing records violate new uniqueness or required-field assumptions.
5. Verify legacy `organizationId: null` migration behavior where relevant.
6. Identify whether rollback requires data repair rather than only reverting application code.

Do not treat a database/schema change as automatically reversible.

### Authentication and secrets

- Verify Clerk production keys belong to the production Clerk instance.
- Verify product callback/sign-in/sign-up URLs use the production domain.
- Verify Root Admin uses the independent production signing secret.
- Verify `ALLOW_LEGACY_PRODUCT_AUTH` is unset or false. Production ignores it by design, but it should not be configured as a dependency.
- Verify provider/mailbox credentials are stored encrypted and UI/API responses remain masked.
- Verify no secret appears in commit diffs, build logs, or deployment logs.

## 4. Deployment procedure

1. Freeze unrelated production changes for the deployment window.
2. Confirm the approved commit SHA.
3. Confirm backup freshness and restoration ownership.
4. Deploy the exact approved commit; never deploy an uncommitted local tree.
5. Apply required schema/index changes using the project-approved production procedure.
6. Wait for the application to report healthy before directing all traffic to the new release.
7. Run the smoke checks below.
8. Monitor errors, authentication, queue/workflow execution, provider failures, and database latency closely during the post-deploy window.
9. Record the deployed SHA and deployment timestamp in the release record.

## 5. Required smoke checks

### Platform health

- `GET /api/health` returns healthy application status.
- `GET /api/readiness` confirms required dependencies are available.
- Public marketing/auth routes load without server errors.

### Product authentication

- Clerk sign-in works for a known production test account.
- A product user can access only an organization where membership is active.
- Organization switching rejects organizations where the user is not an active member.
- A disabled internal user cannot regain product access through Clerk synchronization.

### Root Admin

- `/root/login` authenticates independently of Clerk.
- Root Admin session/logout/revocation behavior works.
- Product cookies do not authenticate Root Admin routes and Root Admin cookies do not authenticate product routes.

### Support workflow

Using a dedicated production test organization where possible:

- open the inbox;
- open a ticket;
- change status/priority;
- add/remove a tag;
- assign an active organization member;
- create and send a reply only when it is safe to send to the test mailbox;
- confirm activity/execution history records the action.

### Email

- tenant mailbox settings remain masked in responses;
- SMTP connection/send test succeeds for the production test mailbox;
- inbound signed webhook or controlled IMAP polling creates/threads a test ticket in the correct organization;
- duplicate inbound message handling remains idempotent;
- email delivery logs are tenant-scoped.

### Workflows

- open the versioned workflow builder;
- save a draft;
- run safe draft test mode and confirm no live ticket mutation occurs;
- publish a test workflow only when appropriate;
- run the published manual trigger against a test ticket;
- inspect execution/step history;
- verify a workflow in one organization cannot access another organization's ticket, member, or tag.

## 6. Rollback decision

Rollback immediately when a release causes any of the following and a forward fix is not safer/faster:

- cross-tenant data exposure or authorization bypass;
- product or Root Admin authentication outage;
- destructive or incorrect ticket/email workflow behavior;
- repeated workflow side effects or idempotency failure;
- unreadable encrypted credentials after configuration/key changes;
- severe database corruption/index failure;
- sustained high error rate that prevents normal support operations.

Security or tenant-isolation incidents take priority over preserving the deployment.

## 7. Application rollback procedure

1. Stop further deployments.
2. Record the failing deployment SHA and first observed symptom.
3. Select the last known-good production commit.
4. Determine whether the failing release performed database writes/schema/index changes that the old version cannot safely read.
5. If application-only rollback is safe, deploy the previous approved commit.
6. Run the full smoke checks again.
7. Keep the incident open until data integrity and tenant isolation are verified.

Do not delete failing execution/audit records simply to make dashboards look clean. Preserve evidence for diagnosis.

## 8. Database rollback and data repair

Database rollback is a separate decision from application rollback.

Prefer targeted forward repair when:

- only a small number of records are affected;
- restoring a full backup would discard legitimate newer tenant data;
- the old application can safely operate with the current schema.

Consider point-in-time/full restore only when corruption or destructive migration impact is broad enough to justify losing/replaying later writes.

Before any restore:

1. stop or isolate application writes;
2. capture the current damaged database for forensic comparison;
3. record the restore point and expected data-loss window;
4. verify the encryption master key available at the restore target matches the encrypted credentials in the backup;
5. communicate the expected impact to stakeholders;
6. restore into a separate validation target first whenever the database platform supports it;
7. validate tenant counts, memberships, tickets, messages, workflows, and configuration secrets before switching production traffic.

## 9. Backup policy

### Database

Use the managed MongoDB provider's continuous backup/point-in-time recovery when available. For environments without managed snapshots, schedule authenticated `mongodump` backups to encrypted storage with retention and restore testing.

Backups must be:

- encrypted at rest and in transit;
- access-controlled separately from the application runtime;
- retained according to the approved data-retention policy;
- monitored for completion/failure;
- restored periodically in a non-production environment to prove they are usable.

### Non-database state

Back up or escrow:

- encryption master-key material according to organization security policy;
- production DNS/domain ownership information;
- Clerk configuration metadata;
- infrastructure/deployment configuration;
- external storage configuration after attachments are introduced.

Do not back up secrets into ordinary documentation or source control.

## 10. Restore validation

A restore is incomplete until validation passes.

Check at minimum:

- organization count and active statuses;
- organization membership count/roles;
- disabled user state;
- ticket/customer/message counts for sampled organizations;
- workflow/version/execution relations;
- provider/mailbox ciphertext can still be decrypted by the intended application key;
- audit events remain readable;
- tenant-specific uniqueness constraints are intact;
- Clerk identities still map to the correct internal users;
- health/readiness and smoke tests pass against the restored database.

## 11. Incident severity

### SEV-1

Use for active cross-tenant exposure, leaked production secrets, destructive data corruption, widespread authentication outage, or uncontrolled repeated workflow/email side effects.

Actions:

- declare incident immediately;
- stop or isolate harmful writes;
- disable affected provider/workflow/integration paths;
- revoke/rotate exposed credentials;
- preserve logs/audit evidence;
- rollback or contain before normal feature work resumes.

### SEV-2

Use for major tenant-specific outage, failed inbound/outbound email for many users, provider outage without data exposure, or workflow failures with contained side effects.

### SEV-3

Use for degraded non-critical functionality with a documented workaround and no data/security impact.

## 12. Incident response sequence

1. **Detect** — capture time, environment, tenant(s), request/execution IDs, failing route/provider, and first known symptom.
2. **Contain** — disable the smallest unsafe component: workflow, provider, mailbox, feature flag, deployment, or write path.
3. **Preserve evidence** — retain application logs, audit events, workflow executions/steps, provider failure records, deployment SHA, and relevant database snapshots.
4. **Assess scope** — determine whether impact is global, organization-specific, identity-specific, or integration-specific.
5. **Remediate** — rollback, repair data, rotate credentials, or deploy a tested forward fix.
6. **Validate** — run tenant-isolation and smoke checks before reopening the affected capability.
7. **Communicate** — provide factual impact and recovery status without guessing.
8. **Review** — document root cause, detection gap, prevention work, and owners with deadlines.

## 13. Secret/provider incident actions

When an integration secret may be compromised:

- disable the affected provider/credential immediately;
- rotate at the upstream provider;
- update the encrypted stored credential;
- revoke the old credential upstream;
- review audit/provider usage logs for unexpected activity;
- never expose the old decrypted value during investigation;
- rotate the application encryption master key only when the master key itself is compromised and only with a tested re-encryption plan.

## 14. Tenant-isolation incident actions

When one organization may have accessed another organization's data:

1. treat as SEV-1;
2. disable the affected endpoint/feature or roll back immediately;
3. preserve request IDs, user ID, active organization ID, route, record IDs, and audit events;
4. identify every potentially exposed organization and data type;
5. test the service/repository tenant filters directly;
6. do not assume UI scoping prevented API access;
7. complete required legal/privacy notification assessment before closing the incident.

## 15. Workflow incident actions

For repeated or incorrect workflow side effects:

- archive/disable the affected workflow;
- stop the worker/queue consumer once durable worker infrastructure exists if executions remain unsafe;
- inspect `WorkflowExecution` and `WorkflowExecutionStep` history;
- use idempotency keys to determine duplicate versus distinct events;
- never replay failed external side effects until their upstream outcome is known;
- safe draft test mode is non-mutating and may be used to reproduce supported graph logic without changing the ticket.

## 16. Post-incident requirements

Every SEV-1 and SEV-2 incident should produce:

- impact window;
- affected organizations/users/data classes;
- root cause;
- detection method;
- containment and recovery actions;
- whether credentials/data were exposed;
- why existing tests/monitoring did not prevent or detect it sooner;
- concrete follow-up changes to code, tests, monitoring, runbooks, or process;
- owners and target dates.

Do not mark the incident resolved solely because the service is back online. Resolution requires validated data integrity, tenant isolation, and follow-up ownership.
