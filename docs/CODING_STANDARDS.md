# Coding Standards

## Formatting & Lint
- Run `npm run lint` (root script delegates to backend + frontend) before opening PRs; warnings are treated as failures.
- Prettier is configured via `.prettierrc` and applied automatically by IDE save hooks; keep line length at 100 for TS and 120 for MD.
- TypeScript strictness is enforced via `npm run typecheck` in both workspaces—no implicit `any`, exhaustive switch, and no unused variables.

## Layering Rules
- **Backend:** Controllers stay thin (parameter parsing + service delegation). Services are the only place that talk to Prisma; never inject Prisma directly into controllers. DTOs must live alongside their module and expose a static Zod schema for the global validation pipe.
- **Frontend:** Pages orchestrate hooks and pass data down; rendering-only components belong under `src/components/**`. API calls live in `src/api` and should use the shared Axios client so interceptors stay centralized. Keep Zustand stores minimal and colocate derived selectors next to usage sites.

## Error Handling & Logging
- Throw Nest HTTP exceptions (`NotFoundException`, `BadRequestException`, etc.) inside services; the `HttpExceptionFilter` standardizes responses.
- Dashboard fan-out helpers flip a `degraded` flag instead of throwing, so new service calls must follow the same pattern and add descriptive log tags.
- Prefer `Logger` for structured server logs. On the frontend, surface fetch errors via React Query `error` states and user-friendly toasts/panels rather than console chatter.

## Testing Expectations
- Backend: use Jest + Supertest for controllers and integration flows. Database-dependent specs should spin up a Postgres container via docker-compose or use the mock Prisma seed data.
- Frontend: `vitest` + Testing Library for components, plus React Query hook tests using MSW-style stubs (`frontend/src/test-utils`).
- When changing DTOs or Prisma schema, add regression tests (backend) and update React mocks (`frontend/src/test`).

## Misc
- Prefer dayjs utilities under `backend/src/utils` for timezone math; do not reimplement ad hoc date parsing.
- Keep docs and chunk outputs fresh by running `npm run refresh:context` before handing work off to another engineer.
