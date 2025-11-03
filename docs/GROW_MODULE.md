# GROW Module

## Overview
- Centralizes personal growth tracking inside the product by combining senior feedback, community exposure, skill boosts, and visibility plays.
- Provides a dedicated backend module (`GrowModule`) with typed DTOs, REST endpoints, and Prisma models for reviews, events, boost tasks, and project highlights.
- Frontend surface lives at `/growth` (`GrowPage`) and reuses the shared design system to present colour-coded sections, actionable modals, and boost-task suggestions.

## Data Models
- **GrowthReview**
  - Fields: `id`, `reviewerId` (FK → `Contact`), `projectName`, `summary`, `score`, `reviewedAt`, `takeaways`.
  - Used to log qualitative and quantitative feedback from senior contacts.
- **GrowthEvent**
  - Fields: `id`, `name`, `date`, `location`, `attended`, `notes`, `followUps`, `createdAt`, `updatedAt`.
  - Tracks meetups/webinars, attendance status, and follow-up actions.
- **GrowthBoostTask**
  - Fields: `id`, `title`, `description`, `category` (`skills-gap | visibility-gap | network-gap`), `impactLevel (1-5)`, `tags`, `status`, `createdAt`, `updatedAt`, `completedAt`.
  - Stores growth boosts and powers quick status toggles plus suggestions.
- **ProjectHighlight**
  - Fields: `id`, `projectName`, `platformUrl`, `spotlight`, `plannedPost`, `published`, `publishedAt`, `createdAt`, `updatedAt`.
  - Records visibility plays linked to projects, spotlighting, and publishing cadence.

## API Endpoints
- `GET /grow/reviews` / `POST /grow/reviews`
  - List and create senior reviews (validates `reviewerId` against Contacts).
- `GET /grow/events` / `POST /grow/events`
  - Manage events/meetups with notes and follow-ups.
- `GET /grow/boost` / `POST /grow/boost` / `PATCH /grow/boost/:id`
  - CRUD for boost tasks plus status transitions (pending → completed etc).
- `GET /grow/boost/suggest`
  - Runs `boost-recommender.ts` to return 3–5 contextual suggestions based on user stack, outreach pace, event attendance, and published highlights.
- `GET /grow/projects` / `POST /grow/projects` / `PATCH /grow/projects/:id`
  - Manage project visibility highlights, spotlight flags, and publish state.
- All routes are wired into Nest Swagger docs automatically through DTO metadata (available at `/docs` when server runs).

## Relationships & Integrations
- **Contacts & Reviews**: Every `GrowthReview.reviewerId` references an existing contact. Creating a review will throw a `404` if the contact is missing.
- **Projects & Stack Signals**: Boost suggestions pull stack data from `Project.stack` to compare against stubbed market trends for skills-gap detection.
- **Jobs & Outreach**: Suggestion helper inspects last 7 days of outreach activity to recommend networking boosts when momentum dips.
- **KPI Alignment**: Weekly KPI service now counts both legacy (`CodeReview`, `Event`, `BoostTask`) and new GROW entities to avoid regressions while migrating.

## Frontend Surfaces
- `GrowPage.tsx` renders four sections (Reviews, Events, Boost Tasks, Projects) with dedicated cards:
  - `ReviewCard`, `EventCard`, `BoostTaskCard`, `ProjectCard`.
  - Shared modal `AddGrowItemModal` handles create flows for all item types using React Query mutations.
  - Boost section features a “Suggest boosts” button that calls `/grow/boost/suggest` and allows one-click adds.
- Progress banner summarises current month counts (events attended, boosts completed, reviews logged).
- Cards are colour-coded (Blue, Purple, Orange, Teal) to mirror growth pillars.

## Boost Recommender
- Implemented in `/backend/src/modules/grow/boost-recommender.ts`.
- Inputs: user stack (from projects), stubbed market trend list, activity stats (outreach 7d, events 30d, boosts completed 30d, highlights published 30d), and active boost titles.
- Outputs: Up to five suggestions tagged with category + impact level. Duplicate titles or already-open boosts are filtered out.
- Service endpoint aggregates the required stats via Prisma before calling the helper.

## QA & Notes
- Seeder (`backend/src/prisma/seed.ts`) now seeds initial GROW data for onboarding demos.
- Backend lint includes legacy warnings unrelated to this change; frontend lint currently fails due to upstream ESLint config (`plugin:react-refresh/recommended`).
- Manual QA checklist (covered during implementation):
  - CRUD flows verified via API service for each section.
  - Boost suggestions return network/visibility/skills tasks and allow “add to my tasks”.
  - Review creation requires valid contact and persists reviewer info.
  - Progress summary updates as data sets change.
