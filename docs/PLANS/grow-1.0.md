# GROW Module v1.0 Plan

## 1) Purpose & Scope
- Deliver an active personal growth tracking module integrated with Contacts and Jobs.
- Centralize senior reviews, events/meetups, skill boost tasks, and project visibility highlights.
- Focus on surfacing actionable insights (suggested boost tasks, progress summaries) without altering existing Contacts/Jobs schemas.

## 2) Functional Areas
- **Senior Reviews**: Log reviewer (linked Contact), project name, summary, score, optional takeaways, and review date.
- **Events & Meetups**: Track upcoming/past events, attendance state, location/notes, and structured follow-ups.
- **Boost Tasks**: Maintain backlog of growth-oriented tasks with category, impact level, tags, status, and auto-suggested items.
- **Projects & Posts**: Highlight project visibility, planned/published posts, and spotlight flags per project.

## 3) Data Model Outline
- **GrowthReview (Prisma)**: `id`, `reviewerId` (FK to Contact.id), `projectName`, `summary`, `score (Int)`, `reviewedAt`, `takeaways`.  
  **DTO**: `GrowthReviewDto` for GET responses and `CreateGrowthReviewDto` for POST payload (validate reviewerId, score range, optional takeaways).
- **Event (Prisma)**: `id`, `name`, `date`, `location?`, `attended (Boolean)`, `notes?`, `followUps (String[])`.  
  **DTOs**: `EventDto`, `CreateEventDto`, optional `UpdateEventDto` for future edits.
- **BoostTask (Prisma)**: `id`, `title`, `description?`, `category (enum-like string)`, `impactLevel (1-5)`, `tags (String[])`, `status`, `createdAt`.  
  **DTOs**: `BoostTaskDto`, `CreateBoostTaskDto`, `UpdateBoostTaskDto` (status/description/tags/impact updates), plus `SuggestedBoostTaskDto`.
- **ProjectHighlight (Prisma)**: `id`, `projectName`, `platformUrl?`, `spotlight (Boolean)`, `plannedPost?`, `published (Boolean)`, `publishedAt?`.  
  **DTOs**: `ProjectHighlightDto`, `CreateProjectHighlightDto`, `UpdateProjectHighlightDto`.
- **Shared DTO Concerns**: apply class-validator decorators (string length, isUrl where relevant, enums for category/status) and align with API contract.

## 4) API Endpoints
- `GET /grow/reviews` → list reviews (filter by reviewer/contact or date range later).
- `POST /grow/reviews` → create review, verifying reviewer exists in Contacts.
- `GET /grow/events` / `POST /grow/events` → list and create events.
- `GET /grow/boost` / `POST /grow/boost` → list/create boost tasks; `PATCH /grow/boost/:id` for status/metadata updates.
- `GET /grow/boost/suggest` → return suggested boost tasks via recommender helper.
- `GET /grow/projects` / `POST /grow/projects` → list/create highlights; `PATCH /grow/projects/:id` for updates.
- Document all endpoints in Swagger/OpenAPI with DTO references.

## 5) UI Components & Navigation
- New `GrowPage` route reachable from main navigation (left-hand tabs stack with Jobs/Contacts).
- Section layout (cards grid):
  - Senior Reviews → `ReviewCard`, add button triggers shared `AddGrowItemModal`.
  - Events & Meetups → `EventCard`, quick attendance toggle/status chips.
  - Boost Tasks → `BoostTaskCard`, status badges, “Suggest Boost Tasks” action pulling `/grow/boost/suggest`.
  - Projects & Posts → `ProjectCard`, spotlight toggle, publish indicator.
- Shared modal accepts type-specific forms, reuses design system inputs/buttons.  
  React Query hooks: `useReviewsQuery`, `useEventsQuery`, `useBoostQuery`, `useProjectsQuery`, plus mutation hooks with optimistic updates.
- Progress summary banner showing aggregated counts (events attended, boost tasks completed, reviews received).

## 6) Acceptance Criteria
- Prisma schema extended with four models; migrations succeed without touching Contacts/Jobs tables.
- REST endpoints return/accept DTOs with validation, integrate with Prisma service layer, and appear in Swagger docs.
- Boost recommender returns 3-5 relevant suggestions given user stack/activity inputs.
- Frontend `GrowPage` renders four sections with cards, data fetch via react-query, modals for add/edit, and handles optimistic updates.
- “Suggest Boost Tasks” button displays recommended tasks and allows adding them to personal backlog.
- Progress summary bar reflects counts from current month (server-provided or client-calculated from datasets).
- No regressions in existing modules; CI/test suite passes (or documented if gaps remain).

## 7) Test Plan
- **Backend**: Unit tests for grow service methods (CRUD + recommender helper), integration tests for REST endpoints using Supertest (happy paths + validation failures).
- **Frontend**: Component tests for cards/modal interactions, react-query mocks for data fetching states, e2e smoke (Cypress/Playwright) covering add review/event/boost/project and suggestion flow.
- **Manual QA**: Verify CRUD for each section, suggestion generation, cross-link with Contacts (reviewer info), and UI theming (color coding, impact flames).

## 8) Status
- ✅ Phase 1–3 scope implemented (backend module, frontend page, documentation).
- ✅ Boost recommender returns contextual suggestions and integrates with UI.
- ✅ Documentation updated (`docs/GROW_MODULE.md`), and lint/tests attempted (see notes in final summary).
