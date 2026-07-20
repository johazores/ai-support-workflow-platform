import crypto from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ROOT_COOKIE_NAME = "root_session";
const ROOT_SESSION_HOURS = 8;
const ROOT_ISSUER = "ai-support-workflow-platform";
const ROOT_AUDIENCE = "root-admin";

export type RootSessionIdentity = {
  id: string;
  username: string;
  displayName: string;
  tokenId: string;
};

function getRootSecret() {
  const value = process.env.ROOT_SESSION_SECRET;

  if (!value || value.length < 32) {
    throw new Error(
      "ROOT_SESSION_SECRET must be configured with at least 32 characters",
    );
  }

  return new TextEncoder().encode(value);
}

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

export async function createRootSession(
  res: NextApiResponse,
  req: NextApiRequest,
  rootAdmin: { id: string; username: string; displayName: string },
) {
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + ROOT_SESSION_HOURS * 60 * 60 * 1000,
  );
  const metadata = getRequestMetadata(req);

  await prisma.rootSession.create({
    data: {
      rootAdminId: rootAdmin.id,
      tokenId,
      expiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });

  const token = await new SignJWT({
    sub: rootAdmin.id,
    username: rootAdmin.username,
    displayName: rootAdmin.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ROOT_ISSUER)
    .setAudience(ROOT_AUDIENCE)
    .setJti(tokenId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getRootSecret());

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ROOT_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${ROOT_SESSION_HOURS * 60 * 60}`,
  );

  return { tokenId, expiresAt };
}

export async function parseRootSession(
  token?: string,
): Promise<RootSessionIdentity | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getRootSecret(), {
      issuer: ROOT_ISSUER,
      audience: ROOT_AUDIENCE,
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.jti !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.displayName !== "string"
    ) {
      return null;
    }

    const session = await prisma.rootSession.findUnique({
      where: { tokenId: payload.jti },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    const rootAdmin = await prisma.rootAdmin.findUnique({
      where: { id: payload.sub },
    });

    if (!rootAdmin?.isActive) return null;

    return {
      id: rootAdmin.id,
      username: rootAdmin.username,
      displayName: rootAdmin.displayName,
      tokenId: session.tokenId,
    };
  } catch {
    return null;
  }
}

export async function revokeRootSession(token?: string) {
  const identity = await parseRootSession(token);
  if (!identity) return;

  await prisma.rootSession.update({
    where: { tokenId: identity.tokenId },
    data: { revokedAt: new Date() },
  });
}

export function clearRootSessionCookie(res: NextApiResponse) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ROOT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=0`,
  );
}

export async function getCurrentRootAdmin() {
  const cookieStore = await cookies();
  return parseRootSession(cookieStore.get(ROOT_COOKIE_NAME)?.value);
}

export function getRootTokenFromRequest(req: NextApiRequest) {
  return req.cookies[ROOT_COOKIE_NAME];
}
