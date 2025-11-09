# Retrieval Guide

Use the generated chunks under `docs/chunks/` and the manifest `docs/chunks/index.json` to hydrate LLMs with only the code they need. Each chunk carries metadata (`module`, `tags`, `exports`, `imports`, `tokens_est`) so you can programmatically pick the smallest set of files.

## Chunk Index Cheatsheet
- **Backend API** chunks (`chunk-backend-*.md`) → tag `api`, `service`, `db`.
- **Frontend UI** chunks (`chunk-frontend-*.md`) → tag `ui`, `state`, `client`.
- Metadata is already normalized; load `docs/chunks/index.json` and filter by `module`, `tags`, or `exports` names.

## Typical Retrieval Recipes
| Task | Chunks to fetch (≤4) | Notes |
| --- | --- | --- |
| Extend dashboard KPIs | `chunk-backend-dashboard.md`, `chunk-backend-kpi.md`, `chunk-frontend-dashboard.md` | Covers controller/service logic plus the dashboard page widgets. |
| Modify job pipeline routes | `chunk-backend-jobs.md`, `chunk-backend-contacts.md`, `chunk-backend-companies.md` | Captures job CRUD, linked contacts, and company helpers. |
| Update tasks automation UX | `chunk-backend-tasks.md`, `chunk-backend-notifications.md`, `chunk-frontend-pages.md`, `chunk-frontend-shell.md` | Keeps copy edits and automation flows in sync front-to-back. |
| Work on API client auth | `chunk-backend-auth.md`, `chunk-frontend-shell.md`, `chunk-frontend-api.md` | Shows login endpoints plus Axios + session store usage. |

## Tag-based Selection Examples
- **`api` tag** → All controllers/services (useful for OpenAPI-style docs or validating DTOs).
- **`db` tag** → Prisma service + any module touching schema relations (`chunk-backend-prisma`, `chunk-backend-jobs`, etc.).
- **`ui` tag** → Dashboard widgets and entity pages for fast UI refactors.
- **`state` tag** → `chunk-frontend-shell.md` (Zustand store, router shells).

## Thin-Start Prompt Template (≤4 chunks)
```
You are updating the dashboard action center.
Load the following context chunks:
1. docs/chunks/chunk-backend-dashboard.md
2. docs/chunks/chunk-backend-tasks.md
3. docs/chunks/chunk-backend-notifications.md
4. docs/chunks/chunk-frontend-dashboard.md

Only reason about the exported methods, shared invariants, and props described inside these chunks unless explicitly told otherwise.
```

## Cold-Start Example (Token-saving proof)
Goal: “Surface a new `staleOutreach` badge on the dashboard queue.”
1. Load `chunk-backend-dashboard.md` (knows `getSummary` payload) and `chunk-backend-outreach.md` (stale finder logic) to confirm server data shape.
2. Load `chunk-frontend-dashboard.md` to see how `summary.todayQueue` is rendered.
3. Optional: `chunk-backend-tasks.md` if badge counts affect actionable tasks.

That is **3 chunks total**, well under the 4-chunk budget, yet it covers the entire request/response cycle end-to-end.

## Tips
- Prefer chunk links over raw file paths when pairing with an LLM—they include summaries, invariants, and code snippets already sanitized for retrieval.
- Re-run `npm run refresh:context` before large refactors so token estimates stay accurate for retrieval agents.
