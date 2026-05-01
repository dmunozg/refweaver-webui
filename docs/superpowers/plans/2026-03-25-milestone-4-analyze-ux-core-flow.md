# Milestone 4 Analyze UX (Core Flow) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dashboard-first analysis workflow with optional run titles, async lifecycle visibility, recent/terminal dashboard sections, and a paginated analysis history view.

**Architecture:** Extend existing Milestone 3 run domain contracts in BFF with nullable title and paginated list semantics, then add a thin web analysis module with route-level screens (`dashboard`, `new`, `list`, `detail`) behind existing auth gating. Keep domain logic in focused service/client files and keep route/components mostly presentational and orchestration-only.

**Tech Stack:** Bun, TypeScript, Hono, Drizzle ORM, PostgreSQL, React 19, Vite, Vitest

---

## Chunk 1: Backend contract and persistence

### Task 1: Add run title to DB schema

**Files:**
- Modify: `packages/db/src/schema/analysis-runs.ts`
- Modify: `packages/db/src/schema/schema.test.ts`
- Modify: `packages/db/migrations/0000_nebulous_dreadnoughts.sql`

- [ ] **Step 1: Write failing schema test for nullable `title` column on `analysis_runs`**
- [ ] **Step 2: Run schema test to confirm failure**

Run: `bun test packages/db/src/schema/schema.test.ts`
Expected: FAIL on missing `title` column assertion

- [ ] **Step 3: Add `title` column to schema and baseline migration SQL**
- [ ] **Step 4: Re-run schema test to verify pass**

Run: `bun test packages/db/src/schema/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/analysis-runs.ts packages/db/src/schema/schema.test.ts packages/db/migrations/0000_nebulous_dreadnoughts.sql
git commit -m "feat(db): add optional title to analysis runs"
```

### Task 2: Extend run domain/store types for title and pagination

**Files:**
- Modify: `apps/bff/src/runs/types.ts`
- Modify: `apps/bff/src/runs/store.ts`
- Modify: `apps/bff/src/runs/store.test.ts`

- [ ] **Step 1: Write failing tests for title persistence and paginated listing**
- [ ] **Step 2: Run run-store tests to confirm failure**

Run: `bun test apps/bff/src/runs/store.test.ts`
Expected: FAIL for missing title/list pagination behavior

- [ ] **Step 3: Add title fields to run create/record types and add list pagination input/output semantics**
- [ ] **Step 4: Implement paginated query in store (`limit`/`offset` with newest-first order)**
- [ ] **Step 5: Re-run run-store tests**

Run: `bun test apps/bff/src/runs/store.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/bff/src/runs/types.ts apps/bff/src/runs/store.ts apps/bff/src/runs/store.test.ts
git commit -m "feat(bff): support run titles and paginated run store queries"
```

### Task 3: Update run service and route contract

**Files:**
- Modify: `apps/bff/src/runs/service.ts`
- Modify: `apps/bff/src/runs/service.test.ts`
- Modify: `apps/bff/src/routes/runs.ts`
- Modify: `apps/bff/src/routes/runs.test.ts`
- Modify: `apps/bff/src/routes/runs.integration.test.ts`

- [ ] **Step 1: Write failing tests for optional title input normalization and title length guard**
- [ ] **Step 2: Write failing tests for list pagination query handling (`page`, `page_size`)**
- [ ] **Step 3: Run run route/service tests to confirm failures**

Run: `bun test apps/bff/src/runs/service.test.ts apps/bff/src/routes/runs.test.ts`
Expected: FAIL on route/service signatures and validation expectations

- [ ] **Step 4: Implement service support for optional title (`trim`, empty -> `null`, max 120)**
- [ ] **Step 5: Implement route parsing/validation for title and pagination params**
- [ ] **Step 6: Ensure response payload includes pagination metadata for list endpoint**
- [ ] **Step 7: Re-run route/service/integration tests**

Run: `bun test apps/bff/src/runs/service.test.ts apps/bff/src/routes/runs.test.ts apps/bff/src/routes/runs.integration.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/bff/src/runs/service.ts apps/bff/src/runs/service.test.ts apps/bff/src/routes/runs.ts apps/bff/src/routes/runs.test.ts apps/bff/src/routes/runs.integration.test.ts
git commit -m "feat(bff): accept optional run titles and paginated run listing"
```

## Chunk 2: Web analysis data client and screen routing

### Task 4: Add web analysis API client and typed models

**Files:**
- Create: `apps/web/src/analysis/types.ts`
- Create: `apps/web/src/analysis/api.ts`
- Create: `apps/web/src/analysis/api.test.ts`

- [ ] **Step 1: Write failing tests for create/list/get/poll client behavior and error mapping**
- [ ] **Step 2: Run client tests to confirm failure**

Run: `bun test apps/web/src/analysis/api.test.ts`
Expected: FAIL with missing module/functions

- [ ] **Step 3: Implement typed analysis client using existing cookie-auth fetch pattern**
- [ ] **Step 4: Implement `(no title)` rendering helper as a pure utility in types/api layer**
- [ ] **Step 5: Re-run analysis API tests**

Run: `bun test apps/web/src/analysis/api.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/analysis/types.ts apps/web/src/analysis/api.ts apps/web/src/analysis/api.test.ts
git commit -m "feat(web): add analysis API client for run lifecycle flows"
```

### Task 5: Add authenticated analysis navigation shell

**Files:**
- Create: `apps/web/src/navigation/routes.ts`
- Create: `apps/web/src/navigation/use-route.ts`
- Create: `apps/web/src/navigation/use-route.test.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.auth.test.tsx`

- [ ] **Step 1: Write failing tests for route transitions among dashboard/new/list/detail while preserving auth gating**
- [ ] **Step 2: Run App/navigation tests to confirm failure**

Run: `bun test apps/web/src/App.auth.test.tsx apps/web/src/navigation/use-route.test.ts`
Expected: FAIL on missing route system and expected screen states

- [ ] **Step 3: Implement minimal URL-based route state hook (no extra dependency) and route constants**
- [ ] **Step 4: Refactor `App.tsx` to render route-level screens after authenticated state**
- [ ] **Step 5: Re-run App/navigation tests**

Run: `bun test apps/web/src/App.auth.test.tsx apps/web/src/navigation/use-route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/navigation/routes.ts apps/web/src/navigation/use-route.ts apps/web/src/navigation/use-route.test.ts apps/web/src/App.tsx apps/web/src/App.auth.test.tsx
git commit -m "feat(web): add authenticated analysis route shell"
```

## Chunk 3: Dashboard, new analysis, list, and detail UX

### Task 6: Implement New Analysis screen and submit flow

**Files:**
- Create: `apps/web/src/analysis/NewAnalysisView.tsx`
- Create: `apps/web/src/analysis/NewAnalysisView.test.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Write failing tests for optional title + required text submission behavior**
- [ ] **Step 2: Write failing tests for empty-title normalization and submit single-flight**
- [ ] **Step 3: Run tests and confirm failure**

Run: `bun test apps/web/src/analysis/NewAnalysisView.test.tsx`
Expected: FAIL with missing component/flow

- [ ] **Step 4: Implement form UX and wire to analysis API create endpoint**
- [ ] **Step 5: Implement post-submit transition to dashboard/detail with in-progress visibility**
- [ ] **Step 6: Re-run tests**

Run: `bun test apps/web/src/analysis/NewAnalysisView.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/analysis/NewAnalysisView.tsx apps/web/src/analysis/NewAnalysisView.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): add new analysis submit view with optional title"
```

### Task 7: Implement Dashboard sections and lifecycle polling

**Files:**
- Create: `apps/web/src/analysis/DashboardView.tsx`
- Create: `apps/web/src/analysis/DashboardView.test.tsx`
- Create: `apps/web/src/analysis/polling.ts`
- Create: `apps/web/src/analysis/polling.test.ts`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Write failing tests for dashboard section split: in-progress vs terminal-only**
- [ ] **Step 2: Write failing tests for terminal cap at 5 and `(no title)` fallback**
- [ ] **Step 3: Write failing tests for polling transition queued/started -> finished/failed/missing**
- [ ] **Step 4: Run dashboard/polling tests to confirm failure**

Run: `bun test apps/web/src/analysis/DashboardView.test.tsx apps/web/src/analysis/polling.test.ts`
Expected: FAIL on missing component/polling behavior

- [ ] **Step 5: Implement dashboard cards/list + section visibility rules**
- [ ] **Step 6: Implement polling helper with 1s->2s backoff policy**
- [ ] **Step 7: Integrate polling into dashboard/detail orchestration in `App.tsx`**
- [ ] **Step 8: Re-run dashboard/polling tests**

Run: `bun test apps/web/src/analysis/DashboardView.test.tsx apps/web/src/analysis/polling.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/analysis/DashboardView.tsx apps/web/src/analysis/DashboardView.test.tsx apps/web/src/analysis/polling.ts apps/web/src/analysis/polling.test.ts apps/web/src/App.tsx
git commit -m "feat(web): add dashboard lifecycle sections and polling"
```

### Task 8: Implement paginated analysis list (`View all`)

**Files:**
- Create: `apps/web/src/analysis/AnalysisListView.tsx`
- Create: `apps/web/src/analysis/AnalysisListView.test.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Write failing tests for paginated list behavior (10/page, newest first)**
- [ ] **Step 2: Write failing tests for pager controls (prev/next/page indicator)**
- [ ] **Step 3: Run analysis list tests to confirm failure**

Run: `bun test apps/web/src/analysis/AnalysisListView.test.tsx`
Expected: FAIL with missing component/behavior

- [ ] **Step 4: Implement list view and pager controls using BFF pagination metadata**
- [ ] **Step 5: Wire dashboard `View all` navigation to `/analyses` route**
- [ ] **Step 6: Re-run list tests**

Run: `bun test apps/web/src/analysis/AnalysisListView.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/analysis/AnalysisListView.tsx apps/web/src/analysis/AnalysisListView.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): add paginated analysis history view"
```

### Task 9: Implement analysis detail terminal and failure states

**Files:**
- Create: `apps/web/src/analysis/AnalysisDetailView.tsx`
- Create: `apps/web/src/analysis/AnalysisDetailView.test.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Write failing tests for in-progress state, finished payload state, and failed/missing terminal state**
- [ ] **Step 2: Run detail tests to confirm failure**

Run: `bun test apps/web/src/analysis/AnalysisDetailView.test.tsx`
Expected: FAIL with missing detail component

- [ ] **Step 3: Implement detail view render states and CTA back to `New analysis`**
- [ ] **Step 4: Integrate detail route wiring in `App.tsx`**
- [ ] **Step 5: Re-run detail tests**

Run: `bun test apps/web/src/analysis/AnalysisDetailView.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/analysis/AnalysisDetailView.tsx apps/web/src/analysis/AnalysisDetailView.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): add analysis detail lifecycle states"
```

## Chunk 4: Documentation, integration verification, and hardening

### Task 10: API/docs updates for Milestone 4 contract

**Files:**
- Modify: `docs/API.md`
- Modify: `docs/DEVELOPMENT.md`

- [ ] **Step 1: Document optional title input and pagination query/response fields for runs endpoint**
- [ ] **Step 2: Document dashboard/list UX expectations and local run lifecycle behavior**
- [ ] **Step 3: Commit docs changes**

```bash
git add docs/API.md docs/DEVELOPMENT.md
git commit -m "docs: add milestone 4 analysis UX API and usage contract"
```

### Task 11: Final verification artifact and full test pass

**Files:**
- Create: `docs/verification/2026-03-25-milestone-4-analyze-ux-core-flow.md`

- [ ] **Step 1: Run targeted backend tests**

Run: `bun test apps/bff/src/runs/store.test.ts apps/bff/src/runs/service.test.ts apps/bff/src/routes/runs.test.ts apps/bff/src/routes/runs.integration.test.ts`
Expected: PASS

- [ ] **Step 2: Run targeted frontend tests**

Run: `bun test apps/web/src/App.auth.test.tsx apps/web/src/analysis/*.test.ts* apps/web/src/navigation/use-route.test.ts`
Expected: PASS

- [ ] **Step 3: Run workspace test suite**

Run: `bun test`
Expected: PASS

- [ ] **Step 4: Run compose config validation**

Run: `docker compose -f compose.yml config`
Expected: Valid merged config output with no errors

- [ ] **Step 5: Write verification notes and evidence to verification doc**
- [ ] **Step 6: Commit verification artifact**

```bash
git add docs/verification/2026-03-25-milestone-4-analyze-ux-core-flow.md
git commit -m "docs: capture milestone 4 core flow verification evidence"
```
