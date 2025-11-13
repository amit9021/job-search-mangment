# Logging Fields

The backend emits structured JSON as the message portion of each NestJS log line. This section documents the canonical keys so operators can build filters and dashboards confidently.

## Error log payload

| Field | Required | Description |
| --- | --- | --- |
| `timestamp` | ✅ | ISO 8601 timestamp generated at log time (independent of the Nest console prefix). |
| `level` | ✅ | Log level string; the `HttpExceptionFilter` always emits `error`. |
| `context` | ✅ | Logger context source (currently `HttpExceptionFilter`). |
| `requestId` | ✅ | Correlation ID. Propagated from the inbound `x-request-id` header or minted per request, then echoed to the response header and body. |
| `method` | ✅ | HTTP verb of the failing request. |
| `path` | ✅ | Raw request URL. |
| `status` | ✅ | HTTP status code returned to the client. |
| `message` | ✅ | Final error message after translation / normalization. |
| `errorName` | ✅ | `Error.name` (e.g., `BadRequestException`, `PrismaClientKnownRequestError`). Non-`Error` inputs fall back to the JS type. |
| `errorCode` | ❌ | Optional machine-readable code (Prisma error codes, custom enums, etc.). |
| `userId` | ❌ | Populated when the request context captured an authenticated user; omitted for public endpoints. |
| `details` | ❌ | Sanitized metadata such as Prisma `meta` or Zod validation errors. Sensitive fields are redacted (see below). |

Stack traces are passed via the logger's second argument so they remain searchable without polluting the JSON payload.

## Correlation IDs
- Middleware inspects `x-request-id` and seeds the `RequestContextService`; a new UUIDv4 is minted if the header is absent or empty.
- The same ID is stored inside the async context, added to the response header/body, and injected into every error log so downstream systems can stitch traces together.

## Sanitization rules
- The sanitizer recursively walks `details` payloads and replaces any `authorization` or `password` keys (case-insensitive) with the literal `[REDACTED]`.
- Circular references are detected and logged as `[Circular]` to avoid crashes.
- Only sanitized copies are logged, so upstream controllers/filters still receive the original error objects.
