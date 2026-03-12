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

- [ ] **Step 1: Write failing schema tests for new columns/tables**
- [ ] **Step 2: Run schema tests to confirm failure**
- [ ] **Step 3: Implement schema updates and exports**
- [ ] **Step 4: Update migration SQL for existing dev baseline**
- [ ] **Step 5: Re-run schema tests to verify pass**
- [ ] **Step 6: Commit**

### Task 2: Project domain store and service

**Files:**
- Create: `apps/bff/src/projects/types.ts`
- Create: `apps/bff/src/projects/store.ts`
- Create: `apps/bff/src/projects/service.ts`
- Create: `apps/bff/src/projects/store.test.ts`
- Create: `apps/bff/src/projects/service.test.ts`

- [ ] **Step 1: Write failing tests for create/list/get/update/delete/restore rules**
- [ ] **Step 2: Run tests to confirm failure**
- [ ] **Step 3: Implement store methods with owner scoping**
- [ ] **Step 4: Implement service validation and state rules**
- [ ] **Step 5: Re-run tests to verify pass**
- [ ] **Step 6: Commit**

### Task 3: Typed RefWeaver client adapter

**Files:**
- Create: `apps/bff/src/refweaver/types.ts`
- Create: `apps/bff/src/refweaver/errors.ts`
- Create: `apps/bff/src/refweaver/client.ts`
- Create: `apps/bff/src/refweaver/client.test.ts`

- [ ] **Step 1: Write failing tests for success/error mapping per endpoint**
- [ ] **Step 2: Run tests to confirm failure**
- [ ] **Step 3: Implement typed adapter and error mapping**
- [ ] **Step 4: Re-run tests to verify pass**
- [ ] **Step 5: Commit**

### Task 4: Run domain store and service

**Files:**
- Create: `apps/bff/src/runs/types.ts`
- Create: `apps/bff/src/runs/store.ts`
- Create: `apps/bff/src/runs/service.ts`
- Create: `apps/bff/src/runs/store.test.ts`
- Create: `apps/bff/src/runs/service.test.ts`

- [ ] **Step 1: Write failing tests for submit/list/get/poll lifecycle**
- [ ] **Step 2: Run tests to confirm failure**
- [ ] **Step 3: Implement persistence and lifecycle state updates**
- [ ] **Step 4: Implement owner and active-project guards**
- [ ] **Step 5: Re-run tests to verify pass**
- [ ] **Step 6: Commit**

### Task 5: Project routes

**Files:**
- Create: `apps/bff/src/routes/projects.ts`
- Create: `apps/bff/src/routes/projects.test.ts`
- Modify: `apps/bff/src/app.ts`

- [ ] **Step 1: Write failing route tests for project API contract**
- [ ] **Step 2: Run tests to confirm failure**
- [ ] **Step 3: Implement route handlers and request validation**
- [ ] **Step 4: Register routes in app bootstrap**
- [ ] **Step 5: Re-run tests to verify pass**
- [ ] **Step 6: Commit**

### Task 6: Run routes

**Files:**
- Create: `apps/bff/src/routes/runs.ts`
- Create: `apps/bff/src/routes/runs.test.ts`
- Modify: `apps/bff/src/app.ts`

- [ ] **Step 1: Write failing route tests for run lifecycle endpoints**
- [ ] **Step 2: Run tests to confirm failure**
- [ ] **Step 3: Implement route handlers and response mapping**
- [ ] **Step 4: Register routes in app bootstrap**
- [ ] **Step 5: Re-run tests to verify pass**
- [ ] **Step 6: Commit**

### Task 7: Unified error normalization

**Files:**
- Create: `apps/bff/src/http/errors.ts`
- Modify: `apps/bff/src/routes/projects.ts`
- Modify: `apps/bff/src/routes/runs.ts`
- Modify: route tests as needed

- [ ] **Step 1: Write failing tests for envelope and code consistency**
- [ ] **Step 2: Run tests to confirm failure**
- [ ] **Step 3: Implement shared mappers for domain and upstream errors**
- [ ] **Step 4: Apply normalization to all new routes**
- [ ] **Step 5: Re-run tests to verify pass**
- [ ] **Step 6: Commit**

### Task 8: Integration coverage and docs

**Files:**
- Create: `apps/bff/src/routes/projects.integration.test.ts`
- Create: `apps/bff/src/routes/runs.integration.test.ts`
- Modify: `docs/API.md`
- Modify: `docs/DEVELOPMENT.md`
- Create: `docs/verification/2026-03-12-milestone-3-domain-apis.md`

- [ ] **Step 1: Write failing integration tests for ownership and lifecycle flows**
- [ ] **Step 2: Run tests to confirm failure**
- [ ] **Step 3: Implement minimal fixes for uncovered gaps**
- [ ] **Step 4: Update docs and verification artifact**
- [ ] **Step 5: Re-run full test suite and compose config check**
- [ ] **Step 6: Commit**
