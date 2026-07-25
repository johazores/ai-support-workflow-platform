import { randomUUID } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { ZodType } from "zod";
import type { SessionUser } from "@/features/auth/services/session-service";
import { requireApiAuth } from "@/lib/api-auth";
import {
  applyRateLimitHeaders,
  enforceRequestRateLimit,
  type RateLimitClass,
} from "@/lib/rate-limit";
import { isSameOriginMutation } from "@/lib/request-origin";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type ProductApiMethod = (typeof methods)[number];

export class ProductIdentityApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ProductIdentityApiError";
  }
}

type ProductIdentityApiContext<TInput> = {
  req: NextApiRequest;
  res: NextApiResponse;
  user: SessionUser;
  input: TInput;
  requestId: string;
};

type ProductIdentityRouteDefinition<TInput = unknown> = {
  parse?: (req: NextApiRequest) => unknown;
  schema?: ZodType<TInput>;
  rateLimit?: RateLimitClass | false;
  handle: (context: ProductIdentityApiContext<TInput>) => Promise<void> | void;
  mapError?: (
    error: unknown,
  ) => { status: number; message: string; details?: Record<string, unknown> } | null;
  unexpectedErrorMessage?: string;
};

type AnyDefinition = ProductIdentityRouteDefinition<unknown>;
type RouteMap = Partial<Record<ProductApiMethod, AnyDefinition>>;

export function productIdentityApiRoute<TInput>(
  definition: ProductIdentityRouteDefinition<TInput>,
) {
  return definition as AnyDefinition;
}

function requestIdFor(req: NextApiRequest) {
  const incoming = req.headers["x-request-id"];
  if (
    typeof incoming === "string" &&
    incoming.length >= 8 &&
    incoming.length <= 100 &&
    /^[A-Za-z0-9._:-]+$/.test(incoming)
  ) {
    return incoming;
  }
  return randomUUID();
}

function methodFor(req: NextApiRequest): ProductApiMethod | null {
  return methods.includes(req.method as ProductApiMethod)
    ? (req.method as ProductApiMethod)
    : null;
}

export function createProductIdentityApiRoute(routes: RouteMap) {
  const allowedMethods = methods.filter((method) => routes[method]);

  return async function productIdentityApiHandler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const requestId = requestIdFor(req);
    res.setHeader("X-Request-ID", requestId);

    const method = methodFor(req);
    const route = method ? routes[method] : undefined;
    if (!route) {
      res.setHeader("Allow", allowedMethods);
      return res.status(405).json({ message: "Method not allowed", requestId });
    }

    if (method !== "GET" && !isSameOriginMutation(req)) {
      return res.status(403).json({ message: "Invalid request origin", requestId });
    }

    const auth = await requireApiAuth(req, res);
    if (!auth.ok) return;

    if (route.rateLimit !== false) {
      try {
        const rateLimit = await enforceRequestRateLimit({
          req,
          rateLimitClass:
            route.rateLimit ?? (method === "GET" ? "read" : "write"),
          identityId: auth.user.id,
        });
        applyRateLimitHeaders(res, rateLimit);
        if (!rateLimit.allowed) {
          return res.status(429).json({ message: "Too many requests", requestId });
        }
      } catch (error) {
        console.error(`[${requestId}] product identity rate limiting failed`, error);
        return res.status(503).json({
          message: "Request temporarily unavailable",
          requestId,
        });
      }
    }

    let input: unknown = undefined;
    if (route.schema) {
      const parsed = route.schema.safeParse(
        route.parse ? route.parse(req) : req.body,
      );
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid request",
          errors: parsed.error.flatten(),
          requestId,
        });
      }
      input = parsed.data;
    } else if (route.parse) {
      input = route.parse(req);
    }

    try {
      return await route.handle({
        req,
        res,
        user: auth.user,
        input,
        requestId,
      });
    } catch (error) {
      if (error instanceof ProductIdentityApiError) {
        return res.status(error.status).json({
          message: error.message,
          ...(error.details ?? {}),
          requestId,
        });
      }

      const mapped = route.mapError?.(error);
      if (mapped) {
        return res.status(mapped.status).json({
          message: mapped.message,
          ...(mapped.details ?? {}),
          requestId,
        });
      }

      console.error(
        `[${requestId}] ${method} ${req.url ?? "product identity API"} failed`,
        error,
      );
      return res.status(500).json({
        message: route.unexpectedErrorMessage ?? "Request failed",
        requestId,
      });
    }
  };
}
