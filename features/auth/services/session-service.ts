import type { NextApiResponse } from "next";
import { cookies } from "next/headers";

const sessionCookieName = "support_session";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function createSessionValue(user: SessionUser) {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

export function parseSessionValue(value?: string): SessionUser | null {
  if (!value) return null;

  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8");

    return JSON.parse(decoded) as SessionUser;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextApiResponse, user: SessionUser) {
  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=${createSessionValue(
      user,
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionCookieName);

  return parseSessionValue(sessionCookie?.value);
}
