# Observability Foundation

The platform uses structured JSON server logs as the baseline for production observability.

## Server request errors

Next.js `instrumentation.ts` registers `onRequestError` and emits a `server.request.error` JSON event for uncaught server request failures.

Captured context includes:

- request method and path;
- request headers after recursive secret redaction;
- route path, route type, and router kind;
- normalized error name/message;
- development stack trace only outside production.

## Secret redaction

`lib/structured-logger.ts` recursively redacts fields whose names indicate credentials or authentication material, including:

- authorization headers;
- cookies and sessions;
- passwords;
- tokens;
- API keys;
- credentials;
- signatures;
- SMTP/IMAP password fields.

The serializer also limits string length, array length, object depth, and circular structures so error logging cannot explode memory or accidentally dump unbounded payloads.

## External observability providers

This increment intentionally does not add a vendor SDK. The Next.js instrumentation entrypoint is the stable integration point for a later error-tracking/tracing provider configured through the encrypted provider control plane.

The product should continue using API `X-Request-ID` values for user-facing support/debugging. A later increment can propagate those IDs into broader application/service logs and external traces.

## Remaining observability work

- request completion/duration events across standardized API wrappers;
- workflow queue depth, latency, retry, and failure metrics;
- email ingestion/delivery metrics;
- provider latency/cost dashboards;
- external error tracking and alert routing;
- distributed tracing when multi-service execution is introduced.
