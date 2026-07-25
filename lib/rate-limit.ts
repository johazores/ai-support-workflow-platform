import { createHash } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export type RateLimitClass = "read" | "write" | "sensitive";
type RateLimitDimension = "ip" | "identity" | "organization";

type RateLimitPolicy = {
  windowMs: number;
  limits: Record<RateLimitDimension, number>;
};

const policies: Record<RateLimitClass, RateLimitPolicy> = {
  read: {
    windowMs: 60_000,
    limits: { ip: 600, identity: 300, organization: 3_000 },
  },
  write: {
    windowMs: 60_000,
    limits: { ip: 180, identity: 90, organization: 900 },
  },
  sensitive: {
    windowMs: 15 * 60_000,
    limits: { ip: 30, identity: 20, organization: 120 },
  },
};

const globalRateLimitState = globalThis as unknown as {
  lastRateLimitCleanupAt?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
  blockedDimension?: RateLimitDimension;
};

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getRequestIp(req: NextApiRequest) {
  const forwardedFor = firstHeader(req.headers["x-forwarded-for"]);
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  return (
    forwardedIp ||
    firstHeader(req.headers["x-real-ip"]) ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function resultCount(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const document = (value as { value?: unknown }).value;
  if (!document || typeof document !== "object") return null;
  const count = (document as { count?: unknown }).count;
  return typeof count === "number" && Number.isFinite(count) ? count : null;
}

async function incrementBucket(input: {
  rateLimitClass: RateLimitClass;
  dimension: RateLimitDimension;
  subject: string;
  limit: number;
  windowStartMs: number;
  expiresAtMs: number;
}) {
  const subjectHash = digest(input.subject);
  const key = digest(
    `v1|${input.rateLimitClass}|${input.dimension}|${subjectHash}|${input.windowStartMs}`,
  );

  const result = await prisma.$runCommandRaw({
    findAndModify: "RateLimitBucket",
    query: { _id: key },
    update: {
      $setOnInsert: {
        scope: input.rateLimitClass,
        dimension: input.dimension,
        subjectHash,
        windowStartMs: input.windowStartMs,
        expiresAtMs: input.expiresAtMs,
      },
      $inc: { count: 1 },
    },
    upsert: true,
    new: true,
  });

  const count = resultCount(result);
  if (count === null) {
    throw new Error("Rate limiter did not receive an updated bucket count");
  }

  return {
    dimension: input.dimension,
    limit: input.limit,
    count,
  };
}

function cleanupExpiredBuckets(nowMs: number) {
  const lastCleanupAt = globalRateLimitState.lastRateLimitCleanupAt ?? 0;
  if (nowMs - lastCleanupAt < 60 * 60_000) return;

  globalRateLimitState.lastRateLimitCleanupAt = nowMs;
  void prisma
    .$runCommandRaw({
      delete: "RateLimitBucket",
      deletes: [{ q: { expiresAtMs: { $lt: nowMs } }, limit: 0 }],
    })
    .catch((error) => {
      console.error("Rate-limit bucket cleanup failed", error);
    });
}

export async function enforceRequestRateLimit(input: {
  req: NextApiRequest;
  rateLimitClass: RateLimitClass;
  identityId?: string | null;
  organizationId?: string | null;
  now?: Date;
}): Promise<RateLimitResult> {
  const policy = policies[input.rateLimitClass];
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const windowStartMs = Math.floor(nowMs / policy.windowMs) * policy.windowMs;
  const resetAtMs = windowStartMs + policy.windowMs;
  const expiresAtMs = resetAtMs + policy.windowMs;

  cleanupExpiredBuckets(nowMs);

  const subjects: Array<{
    dimension: RateLimitDimension;
    subject: string;
  }> = [{ dimension: "ip", subject: getRequestIp(input.req) }];

  if (input.identityId) {
    subjects.push({ dimension: "identity", subject: input.identityId });
  }
  if (input.organizationId) {
    subjects.push({ dimension: "organization", subject: input.organizationId });
  }

  const buckets = await Promise.all(
    subjects.map(({ dimension, subject }) =>
      incrementBucket({
        rateLimitClass: input.rateLimitClass,
        dimension,
        subject,
        limit: policy.limits[dimension],
        windowStartMs,
        expiresAtMs,
      }),
    ),
  );

  const blocked = buckets.find((bucket) => bucket.count > bucket.limit);
  const remaining = Math.max(
    0,
    Math.min(...buckets.map((bucket) => bucket.limit - bucket.count)),
  );
  const effectiveLimit = Math.min(...buckets.map((bucket) => bucket.limit));
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetAtMs - nowMs) / 1000),
  );

  return {
    allowed: !blocked,
    limit: effectiveLimit,
    remaining,
    resetAt: new Date(resetAtMs),
    retryAfterSeconds,
    ...(blocked ? { blockedDimension: blocked.dimension } : {}),
  };
}

export function applyRateLimitHeaders(
  res: NextApiResponse,
  result: RateLimitResult,
) {
  res.setHeader("X-RateLimit-Limit", String(result.limit));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader(
    "X-RateLimit-Reset",
    String(Math.ceil(result.resetAt.getTime() / 1000)),
  );
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSeconds));
  }
}
