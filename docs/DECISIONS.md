# Decisions

## 2025-02-14 – Database-backed email/password auth
- **Context:** Sharing builds with more than one operator required real user records, expirations, and safer storage than the env-managed admin switch that bootstrapped the project.
- **Decision:** Introduce `/auth/register` + `/auth/login` endpoints that hash passwords with bcrypt, mint 7-day JWTs, and enforce request rate limits. Tokens flow through the existing global guard, while OAuth controllers/providers were stubbed behind a feature flag for future SSO work.
- **Alternatives considered:** (a) Keep env-driven admin credentials and gate multi-user work behind feature flags, (b) ship OAuth-only sign-in. Both left us without a simple self-serve flow or would have blocked testing in air-gapped setups.
- **Consequences:** The `User` table now stores `email` and hashed passwords, seeds rely on `ADMIN_EMAIL/ADMIN_PASSWORD`, and frontend clients persist tokens locally with decode-on-load logout. Future OAuth work can implement the provider interface without reshaping the rest of the stack.

## 2025-11-09 – Env-managed single admin
- **Context:** Early users only needed a personal mission-control view, so multi-user auth would have added onboarding friction and schema changes.
- **Decision:** Keep one env-backed admin identity. `AuthService` validates credentials from `ADMIN_USERNAME/ADMIN_PASSWORD`, upserts a Prisma `User` row for auditing, and issues JWTs.
- **Alternatives considered:** (a) Integrate db-backed user table with hashed passwords, (b) delegate to OAuth provider. Both were heavier than needed for single-player usage.
- **Consequences:** Ops can rotate credentials by updating env vars, but future multi-user work will require adding a real `Users` module and migration path.

## 2025-11-09 – Cached dashboard aggregation with degraded mode
- **Context:** The dashboard composes data from seven modules (jobs, tasks, followups, outreach, KPI, stats, recommendations). Serial calls made the page feel sluggish and amplified downstream hiccups.
- **Decision:** `DashboardService` fans out concurrent promises with a shared timeout wrapper, caches the result per user/range for `DASHBOARD_CACHE_TTL` minutes, and surfaces `x-dashboard-cache` plus `x-dashboard-degraded` headers to the frontend.
- **Alternatives considered:** (a) Background cron job emitting precomputed snapshots, (b) queue-backed worker. Both were overkill for the current load and would complicate local dev.
- **Consequences:** Burst traffic shares cached payloads and still sees partial data when a dependency times out. Memory footprint grows with user count; revisit before multi-tenant scaling.

## 2025-11-09 – Zod DTOs + global validation pipe
- **Context:** NestJS normally uses class-validator, but this repo already relied on Zod for frontend forms and wanted shared schemas.
- **Decision:** Implement `createZodDto` utilities and apply a global `ZodValidationPipe` so every controller DTO exposes a static schema. Frontend can reuse the same Zod shapes.
- **Alternatives considered:** (a) Standard class-validator decorators, (b) manual validation inside services. Those diverged from the existing Zod ecosystem and risked inconsistent rules.
- **Consequences:** Contributors must update both the DTO type and associated Zod schema when making API changes, but validation logic lives in one place and can be imported by other tooling.
