# Contributing

## Prerequisites
- Node.js 20+, npm 10+, Docker (for Postgres + full-stack compose).
- Copy `.env.example` to `.env.development` (root), `.env.development` (frontend), and `.env.development` (backend) as needed; never commit real secrets.
- Install dependencies once with `npm run install:all`, then `npm run dev:backend` and `npm run dev:frontend` in separate terminals (or `npm run docker:up` for the compose stack).

## Everyday Commands
| Task | Command |
| --- | --- |
| Type check everywhere | `npm run typecheck` |
| Lint everywhere | `npm run lint` |
| Backend unit tests | `npm run --prefix backend test` |
| Frontend unit tests | `npm run --prefix frontend test` |
| Build production bundles | `npm run build:all` |
| Refresh context docs/chunks | `npm run refresh:context` |

## Branches & Commits
- Use the pattern `feature/<ticket>-short-desc` or `fix/<ticket>-short-desc`. Short-lived spikes can live under `spike/*`.
- Keep commits scoped and message them as imperatives: `feat: add outreach stale finder`, `fix: guard dashboard flag`.
- Never rebase over other peoples' published commits; prefer merge commits for integration branches if required by your workflow.

## PR Checklist
1. Lint + typecheck clean (attach command output or CI link).
2. Tests updated/added for any behavior change.
3. `npm run refresh:context` executed so docs, manifest, API surface, and chunks match the code.
4. `.env.example`, `docs/CONFIG_REFERENCE.md`, and ADRs updated if new config/decisions landed.
5. Screenshots for frontend-visible changes, plus note any degraded states touched.
6. Mention data migrations or seed changes explicitly so reviewers can prep their databases.

## Review Expectations
- Highlight risky areas (migrations, caching, concurrency) in PR descriptions.
- Small refactors (<200 LOC) can be rubber-stamped by one reviewer; larger features require two approvals plus QA checklist.
- Keep discussions in GitHub; decisions that affect architecture should be mirrored in `docs/DECISIONS.md`.
