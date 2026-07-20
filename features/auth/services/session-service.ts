import type { NextApiResponse } from "next";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const sessionCookieName = "support_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string;
};

export async function createSessionValue(user: SessionUser) {
  return new SignJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("ai-support-workflow-platform")
    .setAudience("product-user")
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function parseSessionValue(
  value?: string,
): Promise<SessionUser | null> {
  if (!value) return null;

  try {
    const { payload } = await jwtVerify(value, getSecret(), {
      issuer: "ai-support-workflow-platform",
      audience: "product-user",
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      organizationId:
        typeof payload.organizationId === "string"
          ? payload.organizationId
          : undefined,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  res: NextApiResponse,
  user: SessionUser,
) {
  const token = await createSessionValue(user);
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";

  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=86400`,
  );
}

export function clearSessionCookie(res: NextApiResponse) {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";

  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=0`,
  );
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionCookieName);

  return parseSessionValue(sessionCookie?.value);
}
