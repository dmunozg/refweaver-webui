# Milestone 2 Backend Auth Remediation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close critical and important auth/session issues found in spec and code-quality reviews.

**Architecture:** Keep auth logic in BFF with DB-backed sessions, but remove shared mutable transaction state, enforce session expiration in auth checks, and harden payload parsing. Extend integration tests to cover login/logout/me flows and edge cases.

**Tech Stack:** Bun, TypeScript, Hono, Drizzle ORM, PostgreSQL, Vitest

---

## Chunk A: Concurrency Safety (Critical)

### Task A1: Remove shared mutable transaction state

**Files:**
- Modify: `apps/bff/src/auth/store.ts`
- Modify: `apps/bff/src/auth/signup.ts`
- Modify: `apps/bff/src/auth/login.ts`
- Test: `apps/bff/src/auth/store.test.ts`
- Test: `apps/bff/src/auth/signup.test.ts`
- Test: `apps/bff/src/auth/login.test.ts`

- [x] Step 1: Write failing test for transaction-scoped store behavior.
- [x] Step 2: Run tests to verify failure.
- [x] Step 3: Refactor `withTransaction` to provide isolated transaction-scoped store instance.
- [x] Step 4: Update signup/login flows to consume scoped store callback.
- [x] Step 5: Re-run tests to verify pass.
- [ ] Step 6: Commit.

## Chunk B: Session Validity Enforcement (Important)

### Task B1: Reject expired sessions in middleware and `/auth/me`

**Files:**
- Modify: `apps/bff/src/middleware/require-auth.ts`
- Modify: `apps/bff/src/routes/auth.ts`
- Modify: `apps/bff/src/auth/store.ts` (if filtering logic belongs in store)
- Test: `apps/bff/src/routes/protected.test.ts`
- Test: `apps/bff/src/routes/auth.test.ts`

- [ ] Step 1: Write failing tests for expired session -> `401`.
- [ ] Step 2: Run tests to verify failure.
- [ ] Step 3: Implement expiration checks (`expiresAt > now`) and optional cleanup.
- [ ] Step 4: Re-run tests to verify pass.
- [ ] Step 5: Commit.

## Chunk C: JSON Parse Hardening (Important)

### Task C1: Prevent malformed JSON from returning `500`

**Files:**
- Modify: `apps/bff/src/routes/auth.ts`
- Test: `apps/bff/src/routes/auth.test.ts`

- [ ] Step 1: Write failing tests for malformed JSON on signup/login.
- [ ] Step 2: Run tests to verify failure.
- [ ] Step 3: Add guarded parse handling returning deterministic client error.
- [ ] Step 4: Re-run tests to verify pass.
- [ ] Step 5: Commit.

## Chunk D: Integration Coverage Completion (Important)

### Task D1: Add integration coverage for login/logout/me

**Files:**
- Modify: `apps/bff/src/routes/auth.integration.test.ts`

- [ ] Step 1: Write failing integration tests for login success/failure, me authorized/unauthorized/expired, logout invalidation.
- [ ] Step 2: Run tests to verify failure.
- [ ] Step 3: Implement any minimal code fixes required by integration behavior.
- [ ] Step 4: Re-run tests to verify pass.
- [ ] Step 5: Commit.

## Chunk E: Type Hardening (Minor)

### Task E1: Replace `Record<string, unknown>` with explicit auth types

**Files:**
- Modify: `apps/bff/src/auth/store.ts`
- Modify: `apps/bff/src/routes/auth.ts`
- Modify: `apps/bff/src/middleware/require-auth.ts`
- Test: `apps/bff/src/auth/store.test.ts`

- [ ] Step 1: Define explicit `AuthUser` and `AuthSession` types.
- [ ] Step 2: Update store methods to return typed shapes.
- [ ] Step 3: Update consumers and tests.
- [ ] Step 4: Re-run tests to verify pass.
- [ ] Step 5: Commit.

## Final Verification Gate

- [ ] Step 1: Run focused auth tests (unit + route + integration).
- [ ] Step 2: Run `bun run test`.
- [ ] Step 3: Manually verify login/me/logout/protected flow including expired-session rejection.
- [ ] Step 4: Update checklist and commit.
