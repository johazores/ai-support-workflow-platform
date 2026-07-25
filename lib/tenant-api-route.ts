import { randomUUID } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { ZodType } from "zod";
import type { Permission } from "@/features/auth/services/role-service";
import { requireTenantApiPermission } from "@/lib/tenant-api-auth";
import { isSameOriginMutation } from "@/lib/request-origin";

export const tenantApiMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type TenantApiMethod = (typeof tenantApiMethods)[number];

export type TenantApiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
};

export class TenantApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TenantApiError";
  }
}

export type TenantApiErrorResponse = {
  status: number;
  message: string;
  details?: Record<string, unknown>;
};

type TenantApiRouteContext<TInput> = {
  req: NextApiRequest;
  res: NextApiResponse;
  user: TenantApiUser;
  input: TInput;
  requestId: string;
};

type TenantApiRouteDefinition<TInput = unknown> = {
  permission: Permission;
  parse?: (req: NextApiRequest) => unknown;
  schema?: ZodType<TInput>;
  handle: (context: TenantApiRouteContext<TInput>) => Promise<void> | void;
  mapError?: (error: unknown) => TenantApiErrorResponse | null;
  unexpectedErrorMessage?: string;
};

type AnyTenantApiRouteDefinition = TenantApiRouteDefinition<unknown>;

type TenantApiRouteMap = Partial<
  Record<TenantApiMethod, AnyTenantApiRouteDefinition>
>;

export function tenantApiRoute<TInput>(
  definition: TenantApiRouteDefinition<TInput>,
) {
  return definition as AnyTenantApiRouteDefinition;
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

function methodFor(req: NextApiRequest): TenantApiMethod | null {
  return tenantApiMethods.includes(req.method as TenantApiMethod)
    ? (req.method as TenantApiMethod)
    : null;
}

export function createTenantApiRoute(routes: TenantApiRouteMap) {
  const allowedMethods = tenantApiMethods.filter((method) => routes[method]);

  return async function tenantApiHandler(
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
      return res.status(403).json({
        message: "Invalid request origin",
        requestId,
      });
    }

    const auth = await requireTenantApiPermission(req, res, route.permission);
    if (!auth.ok) return;

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
      if (error instanceof TenantApiError) {
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
        `[${requestId}] ${method} ${req.url ?? "tenant API"} failed`,
        error,
      );
      return res.status(500).json({
        message: route.unexpectedErrorMessage ?? "Request failed",
        requestId,
      });
    }
  };
}
