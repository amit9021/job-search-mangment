# Auth Environment Cheatsheet

| Variable | Purpose | Notes |
| --- | --- | --- |
| `JWT_SECRET` | Symmetric key for signing `Authorization: Bearer` tokens. | Generate a long, random string per environment; rotating it invalidates all sessions immediately. |
| `JWT_EXPIRES_IN` | Passed directly to `JwtService.signAsync`. | Accepts any `ms`-style string (e.g. `7d`, `12h`). Frontend relies on the JWT `exp` claim for auto-logout. |
| `BCRYPT_ROUNDS` | Cost factor for password hashing via `bcryptjs`. | Defaults to `12`. Increase cautiously—higher numbers slow registration/login proportionally. |
| `RATE_LIMIT_WINDOW` | In-memory window (milliseconds) tracked by `RateLimitGuard`. | Defaults to `60000` (1 minute). Shared between `/auth/register` and `/auth/login`. |
| `RATE_LIMIT_MAX` | Maximum attempts allowed within the window per IP/prefix. | Defaults to `5`. Lower the value if bots hammer the endpoints. |
| `AUTH_OAUTH_ENABLED` | Feature flag for the OAuth controller stubs. | Leave `false` until Google/LinkedIn providers are wired; when `true`, the controller stops returning 404s. |
| `ADMIN_EMAIL` | bootstrap user used by `npm run prisma:seed`. | Change to match the account you want demo data attached to. Only referenced during seeding. |
| `ADMIN_PASSWORD` | Password hashed for the bootstrap seed user. | Rotating it only affects the seed helper; real users register via HTTP. |

**Tip:** The `scripts/use-env.js` helper honours `ENV_FILE=<path>`—point it at `.env.example` if you only need defaults for local tooling (`ENV_FILE=.env.example npm run --prefix backend prisma:generate`).
