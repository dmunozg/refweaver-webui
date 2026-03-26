# Better Auth Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom auth stack with Better Auth at `/auth`, switch the web app to Better Auth client APIs, and add `adminRole` plus nullable `projectId` to the user model.

**Architecture:** Introduce a dedicated Better Auth server instance in the BFF and mount it at `/auth/*`, then move the web app to the Better Auth client directly. Use a clean-slate schema/migration reset for auth tables and extend the user table with app-specific fields (`adminRole`, `projectId`, optional `username`) while preserving the project bootstrap flow on signup.

**Tech Stack:** Better Auth, Hono, Drizzle ORM, PostgreSQL, Bun, React, Vite, Vitest

---

## Chunk 1: Dependencies and environment contract

### Task 1: Add Better Auth dependencies and env vars

**Files:**
- Modify: `apps/bff/package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/bff/src/config/env.ts`
- Modify: `apps/bff/src/config/env.test.ts`
- Modify: `.env.example`
- Modify: `docs/DEVELOPMENT.md`

- [ ] **Step 1: Write failing env/config tests for Better Auth vars**
- [ ] **Step 2: Run env tests to confirm failure**

Run: `bun test apps/bff/src/config/env.test.ts`
Expected: FAIL on missing Better Auth env expectations

- [ ] **Step 3: Add Better Auth dependencies**
- [ ] **Step 4: Add env parsing for Better Auth settings**
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - retain existing BFF origin parsing
- [ ] **Step 5: Update `.env.example` and docs**
- [ ] **Step 6: Re-run env tests**

Run: `bun test apps/bff/src/config/env.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/bff/package.json apps/web/package.json apps/bff/src/config/env.ts apps/bff/src/config/env.test.ts .env.example docs/DEVELOPMENT.md
git commit -m "chore(auth): add Better Auth config and env vars"
```

## Chunk 2: DB reset and schema adoption

### Task 2: Adopt Better Auth schema and extend user model

**Files:**
- Modify: `packages/db/src/schema/users.ts`
- Modify: `packages/db/src/schema/sessions.ts`
- Create: `packages/db/src/schema/accounts.ts`
- Create: `packages/db/src/schema/verifications.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/schema/schema.test.ts`
- Modify/Create: `packages/db/migrations/*`
- Modify: `packages/db/migrations/meta/_journal.json`
- Modify/Create: `packages/db/migrations/meta/*snapshot*.json`

- [ ] **Step 1: Write failing schema tests for Better Auth tables and user fields**
  - user model includes optional `username`
  - user model includes `adminRole` (`user|admin`)
  - user model includes nullable `projectId` FK to `projects.id`
  - Better Auth core auth tables exist
- [ ] **Step 2: Run schema tests to confirm failure**

Run: `bun test packages/db/src/schema/schema.test.ts`
Expected: FAIL on missing Better Auth schema/user fields

- [ ] **Step 3: Implement Better Auth-compatible schema**
  - add/adjust tables and FKs
  - keep `projectId` nullable FK
  - keep `email` unique, `username` non-unique
- [ ] **Step 4: Generate/apply migration files for the reset state**
- [ ] **Step 5: Re-run schema tests**

Run: `bun test packages/db/src/schema/schema.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/users.ts packages/db/src/schema/sessions.ts packages/db/src/schema/accounts.ts packages/db/src/schema/verifications.ts packages/db/src/schema/index.ts packages/db/src/schema/schema.test.ts packages/db/migrations packages/db/migrations/meta
git commit -m "feat(db): adopt Better Auth schema and user fields"
```

## Chunk 3: BFF Better Auth server and route cutover

### Task 3: Mount Better Auth at `/auth` and replace custom auth runtime

**Files:**
- Create: `apps/bff/src/auth/better-auth.ts`
- Modify: `apps/bff/src/app.ts`
- Modify: `apps/bff/src/index.ts`
- Modify: `apps/bff/src/middleware/require-auth.ts`
- Modify: `apps/bff/src/routes/auth.ts` (remove/retire custom runtime usage)
- Modify: `apps/bff/src/routes/auth.test.ts`
- Modify: `apps/bff/src/routes/auth.integration.test.ts`
- Modify: `apps/bff/src/routes/protected.test.ts`
- Modify: `apps/bff/src/routes/projects.test.ts`
- Modify: `apps/bff/src/routes/projects.integration.test.ts`
- Modify: `apps/bff/src/routes/runs.test.ts`
- Modify: `apps/bff/src/routes/runs.integration.test.ts`

- [ ] **Step 1: Write failing tests for Better Auth-backed auth/session behavior**
- [ ] **Step 2: Run targeted backend tests to confirm failure**

Run: `bun test apps/bff/src/routes/auth.test.ts apps/bff/src/routes/protected.test.ts apps/bff/src/routes/projects.test.ts apps/bff/src/routes/runs.test.ts`
Expected: FAIL with old auth expectations

- [ ] **Step 3: Implement Better Auth server instance**
  - `basePath: "/auth"`
  - `baseURL` from env
  - email/password enabled
  - no email verification
  - user additional fields: `username?`, `adminRole`, `projectId?`
- [ ] **Step 4: Implement signup bootstrap logic**
  - first user becomes admin
  - create default project
  - set `users.projectId`
- [ ] **Step 5: Replace auth middleware/session lookup with Better Auth session APIs**
- [ ] **Step 6: Re-run targeted backend tests**

Run: `bun test apps/bff/src/routes/auth.test.ts apps/bff/src/routes/protected.test.ts apps/bff/src/routes/projects.test.ts apps/bff/src/routes/runs.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/bff/src/auth/better-auth.ts apps/bff/src/app.ts apps/bff/src/index.ts apps/bff/src/middleware/require-auth.ts apps/bff/src/routes/auth.ts apps/bff/src/routes/auth.test.ts apps/bff/src/routes/auth.integration.test.ts apps/bff/src/routes/protected.test.ts apps/bff/src/routes/projects.test.ts apps/bff/src/routes/projects.integration.test.ts apps/bff/src/routes/runs.test.ts apps/bff/src/routes/runs.integration.test.ts
git commit -m "feat(bff): cut auth over to Better Auth"
```

## Chunk 4: Web Better Auth client and UI rewrite

### Task 4: Replace custom web auth stack with Better Auth client

**Files:**
- Create: `apps/web/src/auth/client.ts`
- Create: `apps/web/src/auth/SignupForm.tsx`
- Create: `apps/web/src/auth/SignupForm.test.tsx`
- Modify: `apps/web/src/auth/LoginForm.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.auth.test.tsx`
- Modify: `apps/web/src/auth/types.ts`
- Modify: `apps/web/src/auth/LoginForm.test.tsx`
- Modify: `apps/web/src/auth/use-auth.test.ts`
- Modify: `apps/web/src/auth/use-auth.hook.test.tsx`
- Delete/retire: `apps/web/src/auth/api.ts`, `apps/web/src/auth/use-auth.ts`, and superseded tests

- [ ] **Step 1: Write failing tests for Better Auth client behavior**
  - email-only sign in
  - optional username sign up
  - session gating from Better Auth client
  - sign out
  - display fallback `username -> name -> email local-part`
- [ ] **Step 2: Run targeted web auth tests to confirm failure**

Run: `bun test apps/web/src/App.auth.test.tsx apps/web/src/auth/LoginForm.test.tsx`
Expected: FAIL on old auth stack

- [ ] **Step 3: Implement Better Auth client integration**
- [ ] **Step 4: Rewrite auth forms to use Better Auth client directly**
- [ ] **Step 5: Re-run targeted web auth tests**

Run: `bun test apps/web/src/App.auth.test.tsx apps/web/src/auth/LoginForm.test.tsx apps/web/src/auth/SignupForm.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/auth/client.ts apps/web/src/auth/SignupForm.tsx apps/web/src/auth/SignupForm.test.tsx apps/web/src/auth/LoginForm.tsx apps/web/src/auth/LoginForm.test.tsx apps/web/src/auth/use-auth.test.ts apps/web/src/auth/use-auth.hook.test.tsx apps/web/src/auth/api.ts apps/web/src/auth/use-auth.ts apps/web/src/auth/types.ts apps/web/src/App.tsx apps/web/src/App.auth.test.tsx
git commit -m "feat(web): switch auth UI to Better Auth client"
```

## Chunk 5: Verification and cleanup

### Task 5: Validate auth cutover end to end

**Files:**
- Modify: `apps/bff/src/routes/auth.integration.test.ts`
- Modify: `docs/API.md`
- Create: `docs/verification/2026-03-26-better-auth-cutover.md`

- [ ] **Step 1: Add/adjust integration tests for first-admin and project bootstrap**
- [ ] **Step 2: Run backend integration tests**

Run: `bun test apps/bff/src/routes/auth.integration.test.ts`
Expected: PASS (requires database)

- [ ] **Step 3: Run focused backend and web suites**

Run: `bun test apps/bff/src/routes/*.test.ts apps/web/src/**/*.test.ts*`
Expected: PASS

- [ ] **Step 4: Document verification evidence**
- [ ] **Step 5: Commit**

```bash
git add apps/bff/src/routes/auth.integration.test.ts docs/API.md docs/verification/2026-03-26-better-auth-cutover.md
git commit -m "test(auth): verify Better Auth cutover"
```
