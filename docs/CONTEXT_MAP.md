# Context Map

Purpose-built workspace for running a single-user job-search mission control experience. A NestJS backend orchestrates KPI/statistics aggregation over a Postgres schema while a React/Vite frontend renders dashboards, entity tables, and growth workflows.

```
┌──────────────────────────────┐
│        React / Vite          │
│  Dashboard · Jobs · Contacts │
└────────────┬─────────────────┘
             │ HTTPS + JWT (Axios client)
┌────────────▼─────────────────┐
│        NestJS Backend        │
│ Modules: auth/jobs/contacts… │
│  - Schedule + cache layers   │
│  - Prisma data access        │
└────────────┬─────────────────┘
             │ Prisma Client
┌────────────▼─────────────────┐
│         PostgreSQL           │
│ Jobs · Contacts · Outreach…  │
└──────────────────────────────┘
```

## Modules & Responsibilities
- **Auth** – Env-backed admin login, JWT issuance, guard decorators.
- **Jobs / Contacts / Companies** – Core pipeline CRUD, heat scoring, linked entities.
- **Outreach / Followups / Referrals** – Engagement cadence, reminder queues, stale detection.
- **Dashboard / KPI / Stats** – Aggregated telemetry, caches, degraded-mode headers.
- **Tasks / Notifications / Boosts / Grow / Projects / Events / Reviews** – Personal productivity workflows and growth tracking.
- **Prisma & Common** – Database config, health/status endpoints, Zod validation pipe.
- **Frontend Shell** – Zustand session store, router layout, nav + guard wiring.
- **Frontend Pages** – Dashboard grid, Jobs table, Contacts directory, Grow timeline, Tasks board.

## Data Flow & Integration Points
- React hooks (`useDashboardSummary`, `useWeeklySummary`, etc.) call Axios client with JWT header injected from the persisted session store.
- The backend enforces validation with Zod DTOs via a global pipe, normalizes IDs, and dispatches to module services.
- Services call Prisma for reads/writes; long-running aggregations (dashboard summary, stats, KPI) run in parallel with timeouts and set degraded flags surfaced via HTTP headers consumed by frontend banners.
- Automation endpoints under `/tasks` and `/automation` trigger follow-up creation, while notifications feed the dashboard action center.
- ConfigService loads feature flags and thresholds from layered `.env.*` files resolved in `app.module.ts`.

## Tech Stack & Tooling
- **Runtime:** Node.js 20+, NestJS 10, Prisma 5, React 18, Vite 4, Zustand, TanStack Query, Recharts, Tailwind/PostCSS.
- **Testing/Lint:** Jest & Supertest for backend, Vitest & Testing Library for frontend, ESLint + Prettier shared configs.
- **Infra:** Dockerfiles per frontend/backend, docker-compose.{dev,prod}, scripts/use-env.js for mode-aware env injection.
- **Scheduling/Caching:** `@nestjs/schedule` with crypto shim, in-memory Map cache for dashboard summaries, dayjs/date-fns utilities.

## Navigating the Repo (10 quick hops)
1. `backend/src/app.module.ts` to see wired modules and env cascade.
2. `backend/src/modules/<name>/*.controller.ts` for REST surfaces.
3. `backend/src/modules/<name>/*.service.ts` for business logic and DB access.
4. `backend/src/prisma/prisma.service.ts` plus `prisma/schema.prisma` for data model + env rules.
5. `frontend/src/App.tsx` and `layouts/ShellLayout.tsx` for routing + auth gating.
6. `frontend/src/pages/*.tsx` for page-level orchestration.
7. `frontend/src/components/dashboard/*` for mission-control widgets.
8. `frontend/src/api/*.ts` for Axios client + React Query hooks.
9. `docs/chunks/` for chunked summaries with signatures/snippets.
10. `scripts/refresh-context.mjs` (via `npm run refresh:context`) to regenerate every context artifact.
