import type { NextApiRequest } from "next";

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function configuredApplicationOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;

  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

function requestHostOrigin(req: NextApiRequest) {
  const host =
    firstHeader(req.headers["x-forwarded-host"]) ||
    firstHeader(req.headers.host);
  if (!host) return null;

  const forwardedProtocol = firstHeader(req.headers["x-forwarded-proto"]);
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : process.env.NODE_ENV === "production"
        ? "https"
        : "http";

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

export function allowedRequestOrigins(req: NextApiRequest) {
  return new Set(
    [configuredApplicationOrigin(), requestHostOrigin(req)].filter(
      (origin): origin is string => Boolean(origin),
    ),
  );
}

function suppliedRequestOrigin(req: NextApiRequest) {
  const origin = firstHeader(req.headers.origin);
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      return null;
    }
  }

  const referer = firstHeader(req.headers.referer);
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

export function isSameOriginMutation(req: NextApiRequest) {
  const allowed = allowedRequestOrigins(req);
  const supplied = suppliedRequestOrigin(req);

  if (!supplied || allowed.size === 0) return false;
  return allowed.has(supplied);
}
