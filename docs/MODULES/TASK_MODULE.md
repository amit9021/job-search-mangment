# TASKS Module

## Overview
The TASKS module is the daily execution hub for Jobhunt. It delivers quick capture, contextual linking, recurrence, snooze workflows, and lightweight analytics so outreach, applications, and growth work stay on track.

Key concepts:
- **Tasks** hold work with metadata (priority, status, due/start times, recurrence, tags, checklist, context links).
- **Quick add parser** understands natural phrasing, tags, context handles, and recurrence cues; ambiguous matches return suggestions.
- **Snooze presets** provide one-click rescheduling aligned with common cadences.
- **KPIs** summarise workload health: due today, overdue, velocity (7 days), and execution streak.
- **Automation** seeds follow-up tasks for untouched outreach events.

## Data model
`prisma/schema.prisma`
```prisma
model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      String   @default("Todo")   // Todo | Doing | Done | Blocked
  priority    String   @default("Med")    // Low | Med | High
  tags        String[] @default([])
  dueAt       DateTime?
  startAt     DateTime?
  recurrence  String?                        // RRULE string
  source      String   @default("Manual")  // Manual | Rule | Recommendation
  links       Json?
  checklist   Json?
  createdAt   DateTime @default(now())
  completedAt DateTime?

  @@index([dueAt])
  @@index([status])
}
```
Checklist JSON serialises as `[{ text: string, done: boolean }]`. Links JSON holds contextual identifiers: `{ jobId?, contactId?, growType?, growId?, outreachId? }`.

## REST API
Base path: `/tasks`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/tasks` | List tasks, query params: `view=today|upcoming|backlog|completed`, `search`, `priority`. Response includes `context` ({job, contact, grow}). |
| POST | `/tasks` | Create task. Body accepts fields from model (omit `id/createdAt`). |
| PATCH | `/tasks/:id` | Update supplied fields. Status `Done` auto-sets/clears `completedAt`. |
| DELETE | `/tasks/:id` | Remove task. |
| POST | `/tasks/bulk` | Batch create (reserved for follow-up events). |
| POST | `/tasks/quick-parse` | Parse free text. Returns `{ title, tags[], priority?, dueAt?, recurrence?, links{}, contexts{}, suggestions[] }`. |
| POST | `/tasks/snooze/:id` | Payload `{ preset: "1h" | "tonight" | "tomorrow" | "nextweek" }`. Updates `dueAt`. |
| GET | `/tasks/kpis` | Returns `{ dueToday, overdue, velocity7d, streak }`. |

Automation hook:
- `POST /automation/outreach-created` with `{ outreachId, contactId?, jobId?, outcome? }`. When outcome missing/`NONE`/`NO_RESPONSE`, creates follow-up task due +3d at 09:00, tags `followup`, source `Rule`.

### Sample quick-parse
Request
```json
{ "text": "Follow up with Dana next tue @10 #followup @contact:Dana @job:Acme !high" }
```
Response (abridged)
```json
{
  "title": "Follow up with Dana",
  "tags": ["followup"],
  "priority": "High",
  "dueAt": "2025-01-07T10:00:00.000Z",
  "links": { "jobId": "job_123" },
  "contexts": { "jobQuery": "Acme", "contactQuery": "Dana" },
  "suggestions": []
}
```

## Quick parser reference
- Natural dates: `today`, `tomorrow 9`, `next tue @10`, `in 3d`, time markers `@09`, `9am`, `13:30`.
- Priority: `!high`, `!med`, `!low`.
- Tags: `#tag` (alphanumeric, `_`, `-`).
- Context:
  - `@job:Acme` or `@job:"Acme Corp"` → job lookup by company/role.
  - `@contact:Dana` or quoted.
  - `@grow:boost`, `@grow:event:webinar`.
- Recurrence: phrases like `every mon wed fri @09` → `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=9;BYMINUTE=0;BYSECOND=0`.
- Ambiguous matches return `suggestions` with candidate IDs; QuickAddBar presents picker before create.

## Snooze presets
| Preset | Rule |
| --- | --- |
| `1h` | Adds 60 minutes from now. |
| `tonight` | Same day 20:00; if past, next day 20:00. |
| `tomorrow` | Next day at 09:00. |
| `nextweek` | Next Monday at 09:00 (local timezone). |

## KPI definitions
- **Due Today**: tasks not `Done` with `dueAt` between start/end of day.
- **Overdue**: tasks not `Done` with `dueAt` before `now`.
- **Velocity (7d)**: count of tasks completed in the last seven days.
- **Streak**: consecutive days (including today) with ≥1 completed task.

## Automation v1
Triggered by outreach creation without a resolved outcome. Generates task titled `Follow up with <contact/company>`, assigns due date +3 days at 09:00, tags `followup`, links to originating contact/job/outreach, source `Rule`. Prevents cold outreach from stalling.

## Keyboard shortcuts (Tasks page)
- `t` — focus Quick Add bar.
- `/` — focus search.
- `space` — toggle Done/Reopen on selected task.
- `e` — open selected task drawer.
- `s` — snooze selected task (`tomorrow` default).
- Click card to set selection; mouse actions and Snooze menu also available.

## Future work
- Inbox/triage queue preceding direct add.
- Rules builder for richer automations.
- Calendar sync and external reminders.
- Kanban/swimlane visualisation.
- Deeper NBA insights (auto-populate based on metrics).
