# Auth Flows & Contracts

All auth endpoints live under `/auth` and use JSON payloads. JWTs are issued with a 7‑day TTL by default and must be presented as `Authorization: Bearer <token>` on protected routes (a global guard enforces this across modules).

## Endpoint Summary
| Method | Path | Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | `{ "email": string, "password": string }` | 201 → `{ "id": string, "email": string, "createdAt": ISO }` | Rate limited (5/min per IP). Rejects duplicate emails with `409`. |
| `POST` | `/auth/login` | `{ "email": string, "password": string }` | 200 → `{ "accessToken": string, "exp": number }` | Rate limited (same window). On success, frontend refetches `/auth/me`. |
| `POST` | `/auth/logout` | none | 204 No Content | Stateless—clears the client session; hook for future blacklist. |
| `GET` | `/auth/me` | — | 200 → `{ "id": string, "email": string, "createdAt": ISO }` | Requires valid Bearer token; response is injected by `JwtStrategy`. |
| `GET` | `/auth/oauth/:provider*` | — | 404 | Controller exists but is feature-flagged off via `AUTH_OAUTH_ENABLED`. |

## Request/Response Details
```http
POST /auth/register
Content-Type: application/json

{
  "email": "teammate@example.com",
  "password": "correcthorsebattery"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "user_123",
  "email": "teammate@example.com",
  "createdAt": "2025-02-14T08:00:00.000Z"
}
```

```http
POST /auth/login
Content-Type: application/json

{
  "email": "teammate@example.com",
  "password": "correcthorsebattery"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "accessToken": "<jwt>",
  "exp": 1740096000
}
```

The `exp` value is the raw JWT claim (seconds since epoch). The frontend stores it in the session slice (`exp * 1000`) and decodes the token at startup; if parsing fails or `exp` is in the past, the user is logged out automatically. React Query’s `useAuth` hook also clears state when `/auth/me` fails with 401.

## Validation & Security
- DTOs are implemented with Zod. Emails must be valid and passwords must be ≥8 characters.
- Passwords are hashed via `bcryptjs` using `BCRYPT_ROUNDS` (default 12). Hash cost can be dialed per environment without code changes.
- Register/login endpoints use the in-memory `RateLimitGuard` (`RATE_LIMIT_WINDOW` + `RATE_LIMIT_MAX`) to prevent brute force.
- `JwtAuthGuard` remains global. Routes opt out with the `@Public()` decorator.
- `/auth/logout` is stateless today; add a blacklist/provider hook if revocation is needed later.

## Seeded Users
`npm run --prefix backend prisma:seed` ensures there is always one user so demo data has an owner. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` to control that bootstrap account; everyone else should use the HTTP register flow.
