import type { NextApiRequest } from "next";
import { auth, clerkClient, getAuth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/features/auth/services/clerk-config";
import {
  getInternalClerkUser,
  syncClerkIdentity,
} from "@/features/auth/services/clerk-user-service";
import type { SessionUser } from "@/features/auth/services/session-service";

async function resolveClerkSessionUser(
  clerkUserId: string,
): Promise<SessionUser | null> {
  const existingUser = await getInternalClerkUser(clerkUserId);
  if (existingUser) return existingUser;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const primaryEmail =
    clerkUser.emailAddresses.find(
      (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
    ) ?? clerkUser.emailAddresses[0];

  if (!primaryEmail?.emailAddress) {
    throw new Error("Clerk user does not have an email address");
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    primaryEmail.emailAddress;

  return syncClerkIdentity({
    clerkUserId,
    email: primaryEmail.emailAddress,
    name,
  });
}

export async function getClerkAppSessionUser() {
  if (!isClerkConfigured()) return null;

  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return null;

  return resolveClerkSessionUser(userId);
}

export async function getClerkApiSessionUser(req: NextApiRequest) {
  if (!isClerkConfigured()) return null;

  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated || !userId) return null;

  return resolveClerkSessionUser(userId);
}
