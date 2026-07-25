import type { Instrumentation } from "next";
import { logError } from "@/lib/structured-logger";

export function register() {
  // Reserved for provider-specific telemetry bootstrap. Keeping this hook present
  // lets production error tracking be added without changing application code.
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  logError("server.request.error", {
    error,
    request: {
      method: request.method,
      path: request.path,
      headers: request.headers,
    },
    route: {
      path: context.routePath,
      type: context.routeType,
      routerKind: context.routerKind,
    },
  });
};
