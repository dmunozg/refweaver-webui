# Milestone 4 Analyze UX (Core Flow) Design

**Date:** 2026-03-25  
**Status:** Approved baseline  
**Scope:** Dashboard-first analysis submission, async lifecycle visibility, and paginated analysis history

## Goal

Deliver the primary authenticated user journey end-to-end: submit a new analysis with optional title, track async progress clearly, and browse recent/full history from a dashboard-centered experience.

## Approach (Selected)

Approach A was selected: dashboard-first navigation with dedicated screens for new analysis, full analysis history, and analysis detail.

- Default post-login landing is a dashboard.
- Dashboard emphasizes a prominent `New analysis` CTA.
- In-progress analyses are isolated in a dedicated section/card area.
- Past analyses show terminal-only records and are capped for scannability.
- Full history is available from `View all` in a paginated list view.

## Product Decisions Locked for Milestone 4

- Dashboard layout order:
  1) `New analysis` CTA
  2) `In progress` analyses (if any)
  3) `Past analyses` (terminal-only: `finished` or `failed`)
- Dashboard past analyses are sorted newest first and truncated to 5.
- `View all` opens a dedicated analysis list view.
- Analysis list view is paginated at 10 per page for V1.
- List rows/cards show:
  - status as red/green circle,
  - created timestamp,
  - title.
- Title is user-provided at submit time via optional form field.
- Empty title is persisted as null and rendered as `(no title)`.
- Auto-generated LLM titles are explicitly deferred to V2.

## Information Architecture

- `/dashboard`
  - Primary authenticated landing page.
  - Shows CTA, in-progress section, and recent terminal list.
- `/analyses/new`
  - Dedicated large-input submission form.
  - Fields: optional title + required pasted text.
- `/analyses`
  - Full analysis list view.
  - Paged, newest first, 10 items per page.
- `/analyses/:runId`
  - Single analysis detail and lifecycle status view.
  - Displays run payload once terminal data is available.

## Data and API Contract Changes

Milestone 3 created local run lifecycle tracking. Milestone 4 extends that contract for UX requirements.

### Data model

Add nullable `title` to `analysis_runs`:

- `title text null`

Behavior:

- input title is trimmed
- if empty after trim -> stored as `null`

### BFF contract updates

- `POST /projects/:projectId/runs`
  - Accept body `{ "text": string, "title"?: string }`.
  - Validate text as required and non-empty after trim.
  - Validate title as optional string with max length guard (120 chars).
- `GET /projects/:projectId/runs`
  - Return run records including title.
  - Add pagination query support for list view (`page`, `page_size`).
- `GET /projects/:projectId/runs/:runId`
  - Return single run including title.

Authorization, project ownership, and error normalization rules from Milestone 3 remain unchanged.

## UX Behavior and Async Lifecycle

### Submit flow

- User opens `/analyses/new`, enters optional title and required text.
- Submit is single-flight protected (no double-submit).
- On accepted submission, user sees in-progress state quickly (dashboard or detail route).

### Polling behavior

- Poll job status through BFF lifecycle endpoint.
- Interval strategy: start at 1s, back off to 2s after a few attempts.
- Non-terminal statuses: `queued`, `started`.
- Terminal statuses and handling:
  - `finished`: move to past analyses and allow detail fetch.
  - `failed`: terminal failure, red status dot and explicit state message.
  - `missing`: terminal unavailable/not-found state, red status dot and explicit state message.

### Dashboard rules

- In-progress section hidden when empty.
- Past section includes terminal-only analyses and max 5 items.
- `View all` navigates to `/analyses`.

### Analysis list rules

- Default sort: newest first.
- Pagination: 10 items per page.
- Controls: previous/next and current page indicator.

## Error Handling UX

- Submit/create failures: inline form error, preserve typed input.
- Polling transient failures: non-blocking warning with continued retry.
- Terminal failure states (`failed`/`missing`): explicit persistent state with clear next action (`New analysis`).

## Testing Requirements

- DB schema test coverage for nullable run title.
- BFF store/service/route coverage for:
  - optional title normalization,
  - title max length validation,
  - paginated run listing,
  - owner-scoped visibility.
- Web tests for:
  - dashboard section split logic,
  - terminal list cap at 5,
  - `(no title)` fallback rendering,
  - paginated list behavior (10 per page),
  - async lifecycle transitions and terminal state rendering.

## Milestone 4 Acceptance Criteria

- Authenticated user lands on dashboard with a prominent `New analysis` action.
- User can submit analysis with optional title and required text.
- Empty title persists as null and displays as `(no title)`.
- Dashboard shows in-progress analyses separately from terminal analyses.
- Dashboard terminal list is newest-first and capped to 5.
- `View all` opens paginated full history (10/page, newest-first).
- User can observe async progress and reach clear terminal outcomes.
- Analysis detail can render completed run data once available.
