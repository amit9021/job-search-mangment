## Job Hunt Management System (MVP)

Job search command centre that keeps daily momentum, tracks KPIs, and surfaces the next best action. Built as a monorepo with NestJS + Prisma backend and Vite + React + Tailwind frontend.

### Stack
- **Backend**: NestJS, Prisma, PostgreSQL, Zod validation, node-cron notifications, JWT auth.
- **Frontend**: Vite + React (TypeScript), Tailwind, React Query, Zustand, Radix UI accents.
- **Infra**: Docker Compose (postgres + backend + frontend), `.env` driven config, Prisma migrations + seed.

### Features
- Dashboard with daily/weekly KPIs, pipeline heat map, and AI-inspired nudges.
- Jobs Kanban with heat badges, staleness tracking, and wizard that logs tailored CV + outreach (+ auto follow-up).
- Networking workspace with strength upgrades, referral insights, and “network stars”.
- Growth tab for senior reviews, events, boost tasks, and spotlight projects.
- Tasks view merging follow-ups and notifications according to the 3-day rule.
- Recommendation engine scoring jobs/network/growth to produce a single “Next Best Action”.

---

## Getting Started

### 1. Clone & install
```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

### 2. Environment
Copy `.env.example` to `.env` (adjust values as needed):
```bash
cp .env.example .env
```
The backend reads `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*`, and `TIMEZONE`. The frontend consumes `VITE_API_URL`.

### 3. Database
```bash
cd backend
npx prisma migrate dev
npm run prisma:seed
```

### 4. Run locally
- Backend: `npm run start:dev` (binds to `PORT` from `.env`, defaults to 3000)
- Frontend: `npm run dev` (binds to `FRONT_PORT` from `.env`, proxies `/api` to `VITE_API_URL`)

Log in with the admin credentials defined in your `.env`.

---

## Docker Compose
```bash
docker-compose up --build
```
Services:
- `db` (PostgreSQL 15)
- `backend` (NestJS build, runs migrations on start)
- `frontend` (Vite dev server proxied to backend)

Stop with `docker-compose down` (data persisted in `db_data` volume).

---

## Example Workflow (happy path)
1. **Plan the day**: Open Dashboard → see KPI gaps and the surfaced Next Best Action.
2. **Add opportunity**: In Jobs → click “Add job & outreach”, fill company/role, add tailored CV score, log first outreach (auto follow-up scheduled in 3 days).
3. **Track momentum**:
   - Daily KPIs increment (Tailored CV + Outreach counters).
   - Dashboard heat map updates with new job record.
   - Follow-ups list shows the scheduled reminder.
4. **Network boost**: Pop over to Contacts → see strength badges, log referrals/reviews (auto upgrades to STRONG / MEDIUM).
5. **Growth alignment**: Use Growth tab to check senior reviews, event prep, and boost tasks for dry spells.
6. **Close the loop**: On Tasks, mark follow-up as sent. A second attempt auto-schedules; after two attempts notifications queue a dormancy review.

---

## Testing
- **Backend**: `npm run test:e2e` (uses mocked Prisma service to cover `/auth/login`, `/kpis/today`, `/recommendations/next`, scheduler contract).
- **Frontend**: `npm run test` (Vitest + Testing Library; KPI rendering + Next Best Action mocked).

---

## Notable Defaults
- Single-user auth via env-provided credentials (JWT 12h lifetime).
- Follow-up cadence: 3-day rule, max 2 attempts, dormancy notification after 7 idle days.
- Recommendation scoring: heat weight + urgency + staleness plus networking/growth modifiers.
- Tailwind palette tuned for clarity, accent colour `brand = #2563eb`.

---

## Next Ideas
- Enrich job/contact drawers with inline edit forms.
- Add MSW-backed tests for API contracts.
- Wire Slack/email notifications using the Notifications table.
