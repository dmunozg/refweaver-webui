# RefWeaver WebUI V1 Roadmap

**Date:** 2026-03-10  
**Status:** Active roadmap  
**Scope:** V1 delivery plan

## Scope Decisions Locked for V1

- Ingestion mode is pasted text only.
- Each new user gets a default user-owned project for low-friction onboarding.
- `team_id` exists in schema as future groundwork, but team-based behavior is deferred.

## Milestone 1: Foundation

**Objective:** Establish a stable baseline for full-stack iteration.

- Bun + TypeScript workspace with isolated app/package boundaries.
- React + Vite frontend scaffold.
- Hono + Bun BFF scaffold.
- Shared DB package with Drizzle schema and migrations.
- Environment and configuration contracts.
- Baseline docs and local developer runbook.

## Milestone 2: Auth and Session Core

**Objective:** Ship secure account access and protected app shell.

- Register/login/logout endpoints.
- Password hashing and credential validation.
- DB-backed sessions with secure HTTP-only cookie handling.
- Protected BFF routes with session resolution.
- Signup bootstrap that creates default project.

## Milestone 3: Project and Run Domain APIs

**Objective:** Create the backend contract the UI can build on.

- Project-scoped run/history endpoints in BFF.
- Typed RefWeaver proxy client in BFF.
- Local tracking for upstream `job_id` and `run_id` lifecycle.
- Consistent error normalization for frontend consumers.

## Milestone 4: Analyze UX (Core Flow)

**Objective:** Deliver the primary user journey end-to-end.

- New Analysis screen with large pasted-text input.
- Submit analyze request via BFF.
- Poll async job status (`queued`, `started`, terminal states).
- Fetch and render completed run data.
- Clear failure states for `failed` and `missing` jobs.

## Milestone 5: Results and Reporting UX

**Objective:** Make sentence-level findings actionable.

- Sentence-by-sentence results view.
- Verdict visibility (`supported`, `contradicted`, `uncertain`) and citation-needed status.
- Evidence drill-down per sentence.
- Filters for high-risk outcomes.
- Report views for markdown and JSON outputs.

## Milestone 6: Hardening and Release Readiness

**Objective:** Reach production-quality reliability and usability.

- End-to-end handling of API error classes (`400`, `401`, `404`, `413`, `422`, `429`).
- Test strategy completion (unit, integration, e2e critical path).
- Accessibility and performance pass.
- Security validation and operational runbook updates.
- Deployment readiness for compose-based environments.

## V1 Release Criteria

- A new user can sign up, log in, and run analysis from a default project.
- The user can follow async progress and reach a terminal result state.
- The user can inspect sentence-level verdicts and evidence.
- The user can open report output in markdown/json modes.
- Auth/session persistence and error handling are stable under normal and failure paths.
