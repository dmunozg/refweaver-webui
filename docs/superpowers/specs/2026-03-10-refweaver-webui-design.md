# RefWeaver WebUI Design

**Date:** 2026-03-10  
**Status:** Approved for implementation  
**Scope:** V1 (pasted-text only)

## Product Goal

Build a WebUI for RefWeaver that lets authenticated users submit pasted scientific text, run async citation/verdict analysis, and review sentence-level support/contradiction results with report views.

## Guiding Decisions

- Frontend stack: React + TypeScript + Vite.
- BFF stack: Hono + TypeScript + Bun.
- Authentication: local accounts with DB-backed sessions.
- V1 ingestion: pasted text only.
- Data organization: project-based.
- New-user UX: auto-create and auto-select a default personal project.
- Future-ready schema: include project `team_id` now, with team behavior deferred.

## Architecture

### Components

- **Web client (React SPA):** Auth UI, analysis form, run status, results explorer, report view.
- **BFF API (Hono):** Auth/session endpoints, project/run APIs, RefWeaver proxy integration, response normalization.
- **Database:** Users, sessions, projects, local run tracking, optional cached result/report metadata.
- **RefWeaver API (external service):** Analyze/search/enrich/report/runs/jobs lifecycle.

### Trust and security boundaries

- Browser never calls RefWeaver directly.
- BFF injects `X-User-Id` for protected RefWeaver calls from authenticated user session.
- Optional upstream `X-API-Key` stays server-side only.
- Session is stored in DB and transported with secure HTTP-only cookies.

## Domain Model (V1)

### `users`

- `id`
- `username` (unique)
- `email` (unique)
- `name`
- `password_hash`
- `team_id` (nullable placeholder)
- `created_at`, `updated_at`

### `sessions`

- `id`
- `user_id`
- `session_token_hash`
- `expires_at`
- `created_at`, `last_seen_at`
- optional metadata: IP, user agent

### `projects`

- `id`
- `name`
- `owner_user_id` (required in V1)
- `team_id` (nullable placeholder)
- `created_at`, `updated_at`

### `analysis_runs`

- `id`
- `project_id`
- `user_id`
- `input_text`
- `status`
- `refweaver_run_id`
- `refweaver_job_id`
- `created_at`, `updated_at`

### Result storage strategy

- V1 can render directly from RefWeaver `/runs/{run_id}` payloads.
- Optional cache tables can be added for performance/history snapshots if needed.

## Core User Flows

### 1) Auth and onboarding

1. User signs up with username/email/name/password.
2. System creates user, DB-backed session, and a default personal project.
3. User lands in protected app shell with default project selected.

### 2) Analyze pasted text

1. User pastes text in New Analysis.
2. Client sends request to BFF.
3. BFF calls RefWeaver `POST /analyze` with injected identity headers.
4. Client polls BFF for job status (1-2s interval, optional backoff).
5. On `finished`, client fetches run details and renders results.

### 3) Review and report

1. User reviews sentence-by-sentence verdicts and evidence.
2. User filters high-risk items (`contradicted`, `uncertain`, citation-needed).
3. User views markdown/json report output and copies/exports content.

## UX Structure

- Left nav: `New Analysis`, `Projects`, `History`, `Account`.
- **New Analysis:** large pasted-text area, submit action, progress timeline.
- **Results:** sentence list/table with verdict badges and expandable evidence.
- **Reports:** markdown preview + JSON tab.
- **Projects:** default project auto-selected, project switcher available.

## API Integration Contract

RefWeaver integration follows `docs/API.md` async lifecycle:

1. `POST /analyze`
2. Poll `GET /jobs/{job_id}` until terminal state
3. Fetch `GET /runs/{run_id}`
4. Optional report fetch (`POST /report` or markdown mode)

Terminal statuses handled in UI:

- `finished` -> fetch and render run
- `failed` -> show failure state
- `missing` -> show unavailable/not found state

## Error Handling Strategy

The UI and BFF must map and preserve API error classes:

- `400` missing identity header/invalid request context
- `401` invalid auth credentials
- `404` missing or unauthorized job/run
- `413` request or input too large
- `422` validation errors
- `429` rate limit exceeded

Error envelopes from RefWeaver are normalized to consistent client-facing structures.

## Non-Goals (V1)

- Manuscript/file upload.
- Team-based permissions and shared collaboration UX.
- Advanced ingestion pipelines.

## Release Acceptance Criteria

- User can register/login/logout and maintain DB-backed session.
- New user receives a default personal project automatically.
- User can submit pasted text, observe async progress, and reach terminal state.
- User can inspect sentence-level verdict/evidence results.
- User can view report output in markdown/json forms.
- V1 schema includes nullable `team_id` in users/projects for future rollout.

## Risks and Mitigations

- **API shape changes:** enforce typed adapters and integration tests against backend contract.
- **Polling load:** use bounded polling intervals and terminal-state stop logic.
- **Large input failures:** pre-submit size guidance and clear `413` UX.
- **Future collaboration migration:** preserve project-level `team_id` now to avoid schema churn.
