# Milestone 3 Domain APIs Design

**Date:** 2026-03-12  
**Status:** Approved baseline  
**Scope:** Project lifecycle and run lifecycle backend contracts

## Goal

Deliver a stable BFF-owned API contract for projects and analysis run lifecycle so the Milestone 4 frontend can build against local domain APIs instead of upstream RefWeaver shapes.

## Architecture

The BFF remains the trust boundary: authenticated user identity is derived from session cookies, and all project/run/job operations are owner-scoped at the BFF layer. A typed RefWeaver client adapter handles upstream calls (`/analyze`, `/jobs/{job_id}`, `/runs/{run_id}`), while local DB tables track project ownership and run lifecycle linkage (`project_id`, `user_id`, upstream `job_id`/`run_id`, status). Upstream and domain errors are normalized into a consistent envelope for frontend consumers.

## Scope Decisions Locked

- Include project lifecycle APIs in Milestone 3.
- Project deletion is soft-delete only in V1.
- Include restore endpoint in V1.
- Include `GET /projects?include_deleted=true` in V1.
- Run domain APIs are project-scoped and ownership-enforced.
- Browser never calls RefWeaver directly.

## BFF API Contract

### Project endpoints

- `POST /projects`
  - Create project for current user.
  - Body: `{ "name": string }`.
- `GET /projects`
  - Default: active projects only.
  - `?include_deleted=true`: include soft-deleted projects.
- `GET /projects/:projectId`
  - Return owner-scoped project detail.
- `PATCH /projects/:projectId`
  - Update project metadata (V1: `name`).
- `DELETE /projects/:projectId`
  - Soft-delete project.
- `POST /projects/:projectId/restore`
  - Restore a soft-deleted project.

### Run endpoints (project-scoped)

- `POST /projects/:projectId/runs`
  - Validate project ownership and active state.
  - Proxy to RefWeaver `POST /analyze`.
  - Persist local run record with upstream IDs and status.
- `GET /projects/:projectId/runs`
  - Return project run history.
- `GET /projects/:projectId/runs/:runId`
  - Return run detail for owner-scoped run.
- `GET /projects/:projectId/jobs/:jobId`
  - Poll upstream job status and update local lifecycle state.

## Data Model Changes

### `projects`

Add nullable soft-delete column:

- `deleted_at timestamptz null`

### `analysis_runs` (new)

- `id` UUID PK
- `project_id` UUID FK -> `projects.id`
- `user_id` UUID FK -> `users.id`
- `input_text` text
- `status` text
- `refweaver_run_id` text nullable
- `refweaver_job_id` text nullable
- `created_at` timestamptz
- `updated_at` timestamptz

Indexes:

- `(project_id, created_at)` for history retrieval
- `(user_id, created_at)` for owner-scoped filtering support

## Error Normalization

Route handlers return a consistent BFF envelope for domain and upstream failures:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

Upstream classes mapped consistently: `400`, `401`, `404`, `413`, `422`, `429`, and network/upstream-availability failures.

## Authorization and Integrity Rules

- Session identity is authoritative for user ownership.
- All project endpoints are owner-scoped.
- All run/job endpoints require project ownership and run ownership.
- Soft-deleted projects:
  - hidden by default list views,
  - includable with `include_deleted=true`,
  - cannot accept new run submissions until restored.

## Testing Requirements

- DB schema tests for soft-delete and analysis run table.
- Unit tests for typed upstream client mapping.
- Service/store tests for ownership and soft-delete behavior.
- Route tests for project lifecycle and run lifecycle contracts.
- Integration tests for owner isolation and run lifecycle transitions.

## Milestone 3 Acceptance Criteria

- Project APIs implemented with soft-delete + restore.
- `include_deleted=true` supported on list endpoint.
- Run lifecycle APIs implemented and project-scoped.
- Typed RefWeaver client in BFF with normalized error mapping.
- Local run lifecycle tracking persisted with upstream IDs.
- Tests and docs updated for frontend consumers.
