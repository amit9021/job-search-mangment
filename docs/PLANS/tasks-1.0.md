# TASKS Module — Plan v1.0
## Objective
Make TASKS the daily execution hub: fast add, context linking (Job/Contact/GROW), recurrence (RRULE), snooze, quick parser, NBA suggestions, and minimal KPIs.

## Scope (MVP)
- Direct add tasks (keyboard-first).
- CRUD tasks with: title, description, dueAt, startAt, priority (Low/Med/High), status (Todo/Doing/Done/Blocked), tags[], checklist[], links {jobId?, contactId?, growType?, growId?}, recurrence (RRULE string), source (Manual|Rule|Recommendation).
- Quick parser (server-side): natural dates (“tomorrow 9”), shortcuts (“next tue @10”), tags (#followup), context (@job:Acme, @contact:Dana), priority (!high).
- Snooze defaults: +1h, Tonight 20:00, Tomorrow 09:00, Next Monday 09:00.
- Views: Today | Upcoming | Backlog | Completed (+ filters).
- KPIs header: Due Today, Overdue, Velocity(7d), Streak(days with ≥1 Done).
- Automation v1: when Outreach created without Outcome → create Follow-up task due +3d (linked to the Contact/Job).
- In-app notifications only (toasts).
- Basic responsive; desktop optimized.

## Out of scope (v1.0)
- External reminders (email/Telegram), Kanban board, advanced rules builder UI, calendar sync.

## Data model (Prisma)
model Task {
  id           String   @id @default(cuid())
  title        String
  description  String?
  status       String   @default("Todo") // Todo | Doing | Done | Blocked
  priority     String   @default("Med")  // Low | Med | High
  tags         String[] @default([])
  dueAt        DateTime?
  startAt      DateTime?
  recurrence   String?  // RRULE
  source       String   @default("Manual") // Manual | Rule | Recommendation
  links        Json     // { jobId?, contactId?, growType?, growId? }
  checklist    Json     // [{text, done}]
  createdAt    DateTime @default(now())
  completedAt  DateTime?
}

(Option v1.1) model TaskRule {...}  // Not in v1.0

## API (REST)
GET  /tasks           (query: view=today|upcoming|backlog|completed, filters)
POST /tasks
PATCH /tasks/:id
DELETE /tasks/:id
POST /tasks/bulk                 // for event follow-ups (kept stub)
POST /tasks/quick-parse          // returns parsed fields from free text
POST /tasks/snooze/:id           // payload: { preset: "1h"|"tonight"|"tomorrow"|"nextweek" }
GET  /tasks/kpis                 // dueToday, overdue, velocity7d, streak

Automation hook:
POST /automation/outreach-created // internal use: creates task if outcome missing

## Frontend
/pages/TasksPage.tsx (Tabs + header KPIs + QuickAddBar)
/components/tasks/TaskCard.tsx
/components/tasks/TaskDrawer.tsx
/components/tasks/QuickAddBar.tsx
/components/tasks/NBABox.tsx
/components/common/ContextChips.tsx

Keyboard shortcuts: `t` add, `e` edit, `space` done, `s` snooze, `/` search.

## Acceptance Criteria
- Direct add works (keyboard-first). Parser fills due/priority/context/tags when present.
- CRUD incl. status/priority/tags/checklist/links/recurrence.
- Snooze presets work and update dueAt.
- KPIs header reflects current list (Due Today, Overdue, Velocity 7d, Streak).
- Views/tabs filter correctly; saved filters basic.
- Context chips show links (Job/Contact/GROW); opening links works.
- Automation v1: Outreach without outcome → follow-up Task due +3d created and linked.
- In-app toasts for create/update/delete; no external notifications.
- Docs created: docs/MODULES/TASK_MODULE.md (see Phase 3).

Commit the plan:
git add docs/PLANS/tasks-1.0.md
git commit -m "Plan: TASKS module v1.0"

## Status
- ✅ Phase 0 — Plan committed
- ✅ Phase 1 — Backend delivered
- ✅ Phase 2 — Frontend delivered
- ✅ Phase 3 — Verification & docs complete
