import { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import {
  disableClerkUser,
  InactiveProductUserError,
  syncClerkIdentity,
} from "@/features/auth/services/clerk-user-service";

export async function POST(request: NextRequest) {
  try {
    const event = await verifyWebhook(request);

    if (event.type === "user.created" || event.type === "user.updated") {
      const primaryEmail =
        event.data.email_addresses.find(
          (emailAddress) =>
            emailAddress.id === event.data.primary_email_address_id,
        ) ?? event.data.email_addresses[0];

      if (!primaryEmail?.email_address) {
        return new Response("Clerk user has no email address", { status: 422 });
      }

      const name =
        [event.data.first_name, event.data.last_name]
          .filter(Boolean)
          .join(" ") ||
        event.data.username ||
        primaryEmail.email_address;

      try {
        const user = await syncClerkIdentity({
          clerkUserId: event.data.id,
          email: primaryEmail.email_address,
          name,
        });

        await recordAuditEvent({
          actorType: "system",
          userId: user.id,
          organizationId: user.organizationId,
          action:
            event.type === "user.created"
              ? "clerk.user-created"
              : "clerk.user-updated",
          targetType: "User",
          targetId: user.id,
        });
      } catch (error) {
        if (!(error instanceof InactiveProductUserError)) throw error;

        // An internal suspension is authoritative. Clerk profile updates are
        // acknowledged without reactivating the product account or memberships.
        console.warn(
          `Ignored Clerk ${event.type} for an inactive internal user`,
          event.data.id,
        );
      }
    }

    if (event.type === "user.deleted" && event.data.id) {
      const user = await disableClerkUser(event.data.id);
      if (user) {
        await recordAuditEvent({
          actorType: "system",
          userId: user.id,
          action: "clerk.user-deleted",
          targetType: "User",
          targetId: user.id,
        });
      }
    }

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Clerk webhook verification failed", error);
    return new Response("Webhook verification failed", { status: 400 });
  }
}
