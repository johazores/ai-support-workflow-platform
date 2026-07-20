import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/features/auth/services/password-service";
import { recordAuditEvent } from "@/features/audit/services/audit-event-service";
import { createRootSession } from "@/features/root-auth/services/root-session-service";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

type RootLoginResult =
  | {
      ok: true;
      rootAdmin: { id: string; username: string; displayName: string };
    }
  | {
      ok: false;
      reason: "invalid" | "locked" | "disabled";
      retryAt?: Date;
    };

function getRequestMetadata(req: NextApiRequest) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim() || req.socket.remoteAddress;

  return {
    ipAddress,
    userAgent: req.headers["user-agent"],
  };
}

export async function loginRootAdmin(
  input: { username: string; password: string },
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<RootLoginResult> {
  const username = input.username.trim().toLowerCase();
  const rootAdmin = await prisma.rootAdmin.findUnique({ where: { username } });
  const metadata = getRequestMetadata(req);

  if (!rootAdmin) {
    await recordAuditEvent({
      actorType: "system",
      action: "root.login.failed",
      metadata: { username, reason: "invalid" },
      ...metadata,
    });
    return { ok: false, reason: "invalid" };
  }

  if (!rootAdmin.isActive) {
    await recordAuditEvent({
      actorType: "root-admin",
      rootAdminId: rootAdmin.id,
      action: "root.login.failed",
      metadata: { reason: "disabled" },
      ...metadata,
    });
    return { ok: false, reason: "disabled" };
  }

  if (rootAdmin.lockedUntil && rootAdmin.lockedUntil.getTime() > Date.now()) {
    return {
      ok: false,
      reason: "locked",
      retryAt: rootAdmin.lockedUntil,
    };
  }

  const passwordIsValid = await verifyPassword(
    input.password,
    rootAdmin.passwordHash,
  );

  if (!passwordIsValid) {
    const failedLoginCount = rootAdmin.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await prisma.rootAdmin.update({
      where: { id: rootAdmin.id },
      data: {
        failedLoginCount: lockedUntil ? 0 : failedLoginCount,
        lockedUntil,
      },
    });

    await recordAuditEvent({
      actorType: "root-admin",
      rootAdminId: rootAdmin.id,
      action: "root.login.failed",
      metadata: {
        reason: lockedUntil ? "locked" : "invalid",
        failedLoginCount,
      },
      ...metadata,
    });

    return lockedUntil
      ? { ok: false, reason: "locked", retryAt: lockedUntil }
      : { ok: false, reason: "invalid" };
  }

  await prisma.rootAdmin.update({
    where: { id: rootAdmin.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  await createRootSession(res, req, rootAdmin);

  await recordAuditEvent({
    actorType: "root-admin",
    rootAdminId: rootAdmin.id,
    action: "root.login.succeeded",
    ...metadata,
  });

  return {
    ok: true,
    rootAdmin: {
      id: rootAdmin.id,
      username: rootAdmin.username,
      displayName: rootAdmin.displayName,
    },
  };
}
