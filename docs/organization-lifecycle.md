# Organization Lifecycle

Internal `Organization` and `OrganizationMember` records are the product tenancy source of truth. Clerk provides product identity, authentication, account recovery, and email invitation delivery; Clerk Organizations are intentionally not used as a second tenant model.

## New Clerk users

A brand-new Clerk-only identity may exist without an organization. Protected product pages redirect that identity to `/onboarding` until it creates or joins an organization.

First-organization onboarding:

1. validates the authenticated Clerk identity has no active membership;
2. creates an active organization with a unique slug;
3. atomically claims `User.defaultOrganizationId` so concurrent submissions cannot create multiple first workspaces;
4. creates an active admin membership;
5. seeds default SLA policies;
6. records an audit event; and
7. compensates provisional database state when provisioning fails.

Password-backed identities from the pre-SaaS application remain on the deterministic `default-workspace` migration path unless they explicitly join another organization.

## Organization selection

Authenticated users can list only active organizations for which they have an active membership. Selecting an organization re-validates both the membership and organization status before persisting `User.defaultOrganizationId`.

The product reloads after a successful switch so server-rendered authorization and tenant data change together.

## Invitations

Organization administrators use the member-management screen to invite an email address with an `admin`, `supervisor`, or `agent` role.

Every invitation is persisted as an `OrganizationInvitation` with organization ownership, inviter, requested role, lifecycle status, expiry, Clerk invitation ID when applicable, and acceptance/revocation timestamps.

### Existing Clerk identity

If the email already belongs to an active internal user linked to Clerk, the user is added or reactivated directly in the organization. No redundant sign-up email is sent. The membership change and accepted invitation history are compensated if persistence fails.

### New or not-yet-linked identity

The application sends a Clerk application invitation with a seven-day expiry and stores the returned Clerk invitation ID. If internal persistence fails after Clerk accepts the send request, the application attempts to revoke the orphaned Clerk invitation.

The internal pending record—not Clerk metadata—is authoritative for the organization and role that will be granted.

### Acceptance

During Clerk identity synchronization, the application checks pending, unexpired invitations for the verified normalized email address. For each invitation whose organization is still active, it creates or reactivates the matching `OrganizationMember`, marks the invitation accepted, records an audit event, and selects the first accepted organization when the user does not already have a default organization.

This makes invitation acceptance resilient to webhook delivery delay: normal authenticated identity resolution can finish the same idempotent acceptance path.

### Revocation and expiry

Only a `users:manage` caller in the invitation's organization can revoke a pending invitation. Clerk delivery is revoked before the internal record is marked revoked. Pending invitations past their local seven-day expiry are normalized to `expired` before listing, creating, accepting, or revoking invitations.

## Security invariants

- Organization IDs from clients never grant membership by themselves.
- Invitation acceptance is keyed by the verified internal email synchronized from Clerk.
- Cross-organization invitation reads and revocations are not permitted.
- Active existing membership is never silently downgraded by invitation acceptance.
- Removing a member deactivates only the organization membership; shared global identity records are not deleted.
- An organization must retain at least one active admin.
- Invitation, organization creation, organization selection, role change, member removal, acceptance, and revocation events are auditable.
