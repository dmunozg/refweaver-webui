# Milestone 2 Auth and Session Core Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver complete auth/session core with register/login/logout, session validation middleware, and protected app shell bootstrap.

**Architecture:** Keep auth domain in BFF with DB-backed session records and HTTP-only cookie sessions. Add explicit session lookup/verification flows and a minimal frontend auth shell using `/auth/me` for bootstrapping protected UI state.

**Tech Stack:** Bun, TypeScript, Hono, Drizzle ORM, PostgreSQL, React, Vite, Vitest

---

## Chunk 1: BFF Auth Domain Completion

### Task 1: Expand auth store for login/logout/session lookup

**Files:**
- Modify: `apps/bff/src/auth/store.ts`
- Create: `apps/bff/src/auth/store.types.ts` (optional)
- Test: `apps/bff/src/auth/store.test.ts`

- [x] Step 1: Write failing tests for `findUserByIdentifier`, `findSessionByTokenHash`, and `deleteSessionByTokenHash`.
- [x] Step 2: Run test to verify failure.
- [x] Step 3: Implement minimal Drizzle queries.
- [x] Step 4: Re-run tests to verify pass.
- [x] Step 5: Commit.

### Task 2: Add login use-case

**Files:**
- Create: `apps/bff/src/auth/login.ts`
- Modify: `apps/bff/src/auth/password.ts` (reuse `verifyPassword`)
- Test: `apps/bff/src/auth/login.test.ts`

- [x] Step 1: Write failing tests for valid and invalid credentials.
- [x] Step 2: Run test to verify failure.
- [x] Step 3: Implement minimal login orchestration.
- [x] Step 4: Re-run tests to verify pass.
- [x] Step 5: Commit.

### Task 3: Add logout + session parsing helpers

**Files:**
- Create: `apps/bff/src/auth/session.ts`
- Create: `apps/bff/src/auth/logout.ts`
- Test: `apps/bff/src/auth/logout.test.ts`
- Test: `apps/bff/src/auth/session.test.ts`

- [x] Step 1: Write failing tests for token extraction and session deletion.
- [x] Step 2: Run tests to verify failure.
- [x] Step 3: Implement minimal helpers.
- [x] Step 4: Re-run tests to verify pass.
- [x] Step 5: Commit.

## Chunk 2: BFF Route Layer and Protection

### Task 4: Add `/auth/login`, `/auth/logout`, `/auth/me`

**Files:**
- Modify: `apps/bff/src/routes/auth.ts`
- Modify: `apps/bff/src/app.ts`
- Test: `apps/bff/src/routes/auth.test.ts`
- Test: `apps/bff/src/routes/auth.integration.test.ts`

- [x] Step 1: Write failing route tests for login/logout/me.
- [x] Step 2: Run tests to verify failure.
- [x] Step 3: Implement handlers.
- [x] Step 4: Re-run tests to verify pass.
- [x] Step 5: Commit.

### Task 5: Add protected-route middleware

**Files:**
- Create: `apps/bff/src/middleware/require-auth.ts`
- Modify: `apps/bff/src/app.ts`
- Test: `apps/bff/src/routes/protected.test.ts` (or extend existing tests)

- [x] Step 1: Write failing tests for 401 and authorized access.
- [x] Step 2: Run tests to verify failure.
- [x] Step 3: Implement middleware.
- [x] Step 4: Re-run tests to verify pass.
- [ ] Step 5: Commit.

## Chunk 3: Frontend Protected Shell Bootstrap

### Task 6: Add frontend auth client + session bootstrap

**Files:**
- Create: `apps/web/src/auth/api.ts`
- Create: `apps/web/src/auth/types.ts`
- Create: `apps/web/src/auth/use-auth.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/main.tsx`

- [ ] Step 1: Write failing test for auth bootstrap states.
- [ ] Step 2: Run test to verify failure.
- [ ] Step 3: Implement minimal `/auth/me` bootstrap flow.
- [ ] Step 4: Re-run tests to verify pass.
- [ ] Step 5: Commit.

### Task 7: Add login/logout UI

**Files:**
- Create: `apps/web/src/auth/LoginForm.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/auth/LoginForm.test.tsx`

- [ ] Step 1: Write failing test for login success/error rendering.
- [ ] Step 2: Run test to verify failure.
- [ ] Step 3: Implement minimal login form and logout action.
- [ ] Step 4: Re-run tests to verify pass.
- [ ] Step 5: Commit.

## Chunk 4: Verification and Completion

### Task 8: Milestone 2 verification gate

- [ ] Step 1: Run `bun run test`.
- [ ] Step 2: Run BFF dev startup smoke test with required env vars.
- [ ] Step 3: Manually verify signup/login/me/logout/protected flow.
- [ ] Step 4: Commit remaining verification/docs updates.
