# Milestone 3 Domain APIs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build project lifecycle and project-scoped run lifecycle APIs with strict ownership checks, soft-delete/restore, typed RefWeaver integration, and normalized errors.

**Architecture:** Keep route handlers thin and delegate to domain services/stores. Use a typed RefWeaver client for upstream calls and local DB persistence for lifecycle tracking. Enforce owner scoping in data and service boundaries.

**Tech Stack:** Bun, TypeScript, Hono, Drizzle ORM, PostgreSQL, Vitest

---

### Task 1: DB schema for soft-delete and run tracking

**Files:**
- Modify: `packages/db/src/schema/projects.ts`
- Create: `packages/db/src/schema/analysis-runs.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/schema/schema.test.ts`
- Modify: `packages/db/migrations/0000_nebulous_dreadnoughts.sql`

- [x] **Step 1: Write failing schema tests for new columns/tables**
- [x] **Step 2: Run schema tests to confirm failure**
- [x] **Step 3: Implement schema updates and exports**
- [x] **Step 4: Update migration SQL for existing dev baseline**
- [x] **Step 5: Re-run schema tests to verify pass**
- [x] **Step 6: Commit**

### Task 2: Project domain store and service

**Files:**
- Create: `apps/bff/src/projects/types.ts`
- Create: `apps/bff/src/projects/store.ts`
- Create: `apps/bff/src/projects/service.ts`
- Create: `apps/bff/src/projects/store.test.ts`
- Create: `apps/bff/src/projects/service.test.ts`

- [x] **Step 1: Write failing tests for create/list/get/update/delete/restore rules**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Implement store methods with owner scoping**
- [x] **Step 4: Implement service validation and state rules**
- [x] **Step 5: Re-run tests to verify pass**
- [x] **Step 6: Commit**

### Task 3: Typed RefWeaver client adapter

**Files:**
- Create: `apps/bff/src/refweaver/types.ts`
- Create: `apps/bff/src/refweaver/errors.ts`
- Create: `apps/bff/src/refweaver/client.ts`
- Create: `apps/bff/src/refweaver/client.test.ts`

- [x] **Step 1: Write failing tests for success/error mapping per endpoint**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Implement typed adapter and error mapping**
- [x] **Step 4: Re-run tests to verify pass**
- [x] **Step 5: Commit**

### Task 4: Run domain store and service

**Files:**
- Create: `apps/bff/src/runs/types.ts`
- Create: `apps/bff/src/runs/store.ts`
- Create: `apps/bff/src/runs/service.ts`
- Create: `apps/bff/src/runs/store.test.ts`
- Create: `apps/bff/src/runs/service.test.ts`

- [x] **Step 1: Write failing tests for submit/list/get/poll lifecycle**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Implement persistence and lifecycle state updates**
- [x] **Step 4: Implement owner and active-project guards**
- [x] **Step 5: Re-run tests to verify pass**
- [x] **Step 6: Commit**

### Task 5: Project routes

**Files:**
- Create: `apps/bff/src/routes/projects.ts`
- Create: `apps/bff/src/routes/projects.test.ts`
- Modify: `apps/bff/src/app.ts`

- [x] **Step 1: Write failing route tests for project API contract**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Implement route handlers and request validation**
- [x] **Step 4: Register routes in app bootstrap**
- [x] **Step 5: Re-run tests to verify pass**
- [x] **Step 6: Commit**

### Task 6: Run routes

**Files:**
- Create: `apps/bff/src/routes/runs.ts`
- Create: `apps/bff/src/routes/runs.test.ts`
- Modify: `apps/bff/src/app.ts`

- [x] **Step 1: Write failing route tests for run lifecycle endpoints**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Implement route handlers and response mapping**
- [x] **Step 4: Register routes in app bootstrap**
- [x] **Step 5: Re-run tests to verify pass**
- [x] **Step 6: Commit**

### Task 7: Unified error normalization

**Files:**
- Create: `apps/bff/src/http/errors.ts`
- Modify: `apps/bff/src/routes/projects.ts`
- Modify: `apps/bff/src/routes/runs.ts`
- Modify: route tests as needed

- [x] **Step 1: Write failing tests for envelope and code consistency**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Implement shared mappers for domain and upstream errors**
- [x] **Step 4: Apply normalization to all new routes**
- [x] **Step 5: Re-run tests to verify pass**
- [x] **Step 6: Commit**

### Task 8: Integration coverage and docs

**Files:**
- Create: `apps/bff/src/routes/projects.integration.test.ts`
- Create: `apps/bff/src/routes/runs.integration.test.ts`
- Modify: `docs/API.md`
- Modify: `docs/DEVELOPMENT.md`
- Create: `docs/verification/2026-03-12-milestone-3-domain-apis.md`

- [x] **Step 1: Write failing integration tests for ownership and lifecycle flows**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Implement minimal fixes for uncovered gaps**
- [x] **Step 4: Update docs and verification artifact**
- [x] **Step 5: Re-run full test suite and compose config check**
- [x] **Step 6: Commit**
