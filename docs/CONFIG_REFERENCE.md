# Config Reference

This table documents every knob referenced in code so new environments can be provisioned without opening source files. All sample values are placeholders—replace with deployment-specific secrets.

## Backend Runtime
| Variable | Default / Example | Effect |
| --- | --- | --- |
| `NODE_ENV` | `development` | Drives which `.env.*` files are loaded by `app.module.ts` and controls Prisma URL selection. |
| `TIMEZONE` | `UTC` | Used by Tasks/Stats services when normalizing daily boundaries. |
| `PORT` | `3001` | NestHTTP listen port; also used by docker-compose and proxy rules. |
| `BACKEND_ALLOWED_ORIGINS` | `http://localhost:5174` | Comma-delimited list of browser origins allowed through CORS. |
| `JWT_SECRET` | `replace-with-long-random-secret` | Symmetric key for `@nestjs/jwt` token signing. |
| `JWT_EXPIRES_IN` | `7d` | Passed to `JwtService.signAsync` to cap session lifetime (frontend uses `exp` claim for auto-logout). |
| `BCRYPT_ROUNDS` | `12` | Cost factor passed to `bcryptjs` when hashing passwords. |
| `RATE_LIMIT_WINDOW` | `60000` | In-memory window (ms) for the auth rate-limit guard. |
| `RATE_LIMIT_MAX` | `5` | Max register/login attempts allowed per IP within the window. |
| `AUTH_OAUTH_ENABLED` | `false` | Feature flag that keeps the OAuth controller stub dormant until providers are implemented. |
| `ADMIN_EMAIL` | `founder@example.com` | Seed helper that ensures demo data owns a user row; change for non-demo seeds. |
| `ADMIN_PASSWORD` | `change_me` | Password used by the seed helper to hash the bootstrap account. |

## Database & Prisma
| Variable | Default / Example | Effect |
| --- | --- | --- |
| `DATABASE_URL_DEV` | `postgresql://user:password@localhost:5432/jobhunt_dev` | Preferred connection string when `NODE_ENV=development`. |
| `DATABASE_URL_TEST` | `postgresql://user:password@localhost:5432/jobhunt_test` | Used for automated tests and by Prisma when `NODE_ENV=test`. |
| `DATABASE_URL_PROD` | `postgresql://user:password@prod-db:5432/jobhunt_prod` | Preferred connection string when `NODE_ENV=production`. |
| `DATABASE_URL` | fallback to DEV | Final fallback for Prisma CLI or when env-specific URLs are missing. |

## Dashboard & Feature Flags (via `backend/src/config/app.ts`)
| Variable | Default | Effect |
| --- | --- | --- |
| `DASHBOARD_V1` | `true` | Master flag toggling the modern dashboard experience and backend controller availability. |
| `DAILY_TARGET_CV` | `5` | KPI daily goal shown in tiles and used when deriving heat. |
| `DAILY_TARGET_WARM` | `5` | Outreach target powering KPI + Insights panels. |
| `DASHBOARD_CACHE_TTL` | `15` (minutes) | Controls dashboard summary cache expiry per user/range combo. |
| `NBA_HIGH_HEAT_THRESHOLD` | `3` | Score at which jobs are labeled high heat for Next Best Action. |
| `NBA_MEDIUM_HEAT_THRESHOLD` | `2` | Medium heat threshold. |
| `NBA_FOLLOWUP_LOOKAHEAD_HOURS` | `48` | Lookahead window when surfacing due follow-ups. |
| `NBA_STALE_TOUCH_DAYS` | `3` | Days since last touch used to tag stale outreach. |

## Frontend (Vite) & Local Dev
| Variable | Default / Example | Effect |
| --- | --- | --- |
| `FRONT_PORT` | `5174` | Vite dev server port; referenced by docker-compose and CORS default. |
| `VITE_API_URL` | `http://localhost:3001` | Base URL injected into Axios client. |
| `VITE_DASHBOARD_V1` | `true` | Enables the compact dashboard grid; false flips to legacy cards. |

## Operational Practices
- `scripts/use-env.js` always prefixes dev/prod/test commands, ensuring Node inherits the right `.env.*` before launching Nest, Vite, or Prisma tools.
- Keep `.env.development.local` for machine overrides; `.env.example` captures the authoritative list and is the only tracked env file.
- Update `docs/CONFIG_REFERENCE.md` plus `.env.example` when introducing new environment knobs so the automation script and chunk docs stay trustworthy.
