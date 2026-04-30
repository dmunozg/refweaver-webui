# Better Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all reviewer flags from the Better Auth cutover: transaction-safe bootstrap, test coverage restoration, type discipline, schema parity, and compose robustness.

**Architecture:** Six independent hardening tasks to be executed in order. Each task produces a self-contained, verifiable change.

**Tech Stack:** Better Auth, Hono, Drizzle ORM, PostgreSQL, Bun, React, Vitest

---

## Chunk 1: Transactional First-User Bootstrap

### Task 1: Wrap bootstrap in explicit `db.transaction()`

**Files:**
- Modify: `apps/bff/src/auth/better-auth.ts`

- [x] **Step 1: Read current bootstrap implementation**

```bash
cat apps/bff/src/auth/better-auth.ts
```

- [x] **Step 2: Add explicit `db.transaction()` wrapper around advisory lock + count + project insert + user update**

The current code uses `pg_advisory_xact_lock` but the DB writes are not inside a `db.transaction()` callback. Wrap the entire critical section:

```typescript
await db.transaction(async (tx) => {
  // 1. Check user count with advisory lock
  // 2. Insert "My First Project" project row
  // 3. Update newly-created user's projectId
  // 4. Set adminRole=admin if first user
});
```

- [x] **Step 3: Verify TypeScript compiles**

Run: `bun tsc --noEmit -p apps/bff/tsconfig.json`
Expected: PASS (no errors)

- [x] **Step 4: Commit**

```bash
git add apps/bff/src/auth/better-auth.ts
git commit -m "fix(auth): wrap bootstrap in explicit transaction"
```

### Task 2: Add failing concurrent signup integration test

**Files:**
- Modify: `apps/bff/src/routes/auth.integration.test.ts`

- [x] **Step 1: Write failing test for concurrent signup race**

```typescript
test("concurrent signups produce exactly one admin and all users have projectId", async () => {
  // Spawn 3 concurrent signup requests
  // Assert: exactly 1 user has adminRole=admin
  // Assert: all users have non-null projectId
  // Assert: exactly 1 project exists
});
```

- [x] **Step 2: Run integration test to verify failure**

Run: `bun test apps/bff/src/routes/auth.integration.test.ts`
Expected: FAIL on race condition (if not wrapped in transaction)

- [x] **Step 3: Commit**

```bash
git add apps/bff/src/routes/auth.integration.test.ts
git commit -m "test(auth): add concurrent signup race safety test"
```

---

## Chunk 2: Restore BFF Auth and Route Test Coverage

### Task 3: Recreate `auth.integration.test.ts`

**Files:**
- Create: `apps/bff/src/routes/auth.integration.test.ts`
- Reference: `apps/bff/src/auth/better-auth.ts` for signup flow

- [x] **Step 1: Write integration test with Better Auth signup/sign-in/sign-out**

```typescript
describe("Better Auth integration", () => {
  test("sign up → sign in → sign out flow", async () => {
    // Sign up a new user
    // Sign in with same credentials
    // Sign out
    // Verify session is cleared
  });

  test("first user gets adminRole=admin and projectId", async () => {
    // Sign up first user
    // Query user from DB
    // Assert adminRole=admin
    // Assert projectId is set
  });

  test("subsequent users get user role and projectId", async () => {
    // Sign up second user
    // Query user from DB
    // Assert adminRole=user
    // Assert projectId is set
  });
});
```

- [x] **Step 2: Run integration test**

Run: `bun test apps/bff/src/routes/auth.integration.test.ts`
Expected: PASS (requires running DB)

- [x] **Step 3: Commit**

```bash
git add apps/bff/src/routes/auth.integration.test.ts
git commit -m "test(auth): recreate integration tests for Better Auth flow"
```

### Task 4: Add route negative-path tests

**Files:**
- Modify: `apps/bff/src/routes/auth.test.ts`
- Modify: `apps/bff/src/routes/projects.test.ts`
- Modify: `apps/bff/src/routes/runs.test.ts`

- [x] **Step 1: Write negative-path tests for auth.test.ts**

```typescript
describe("auth negative paths", () => {
  test("POST /auth/signin rejects invalid password", async () => {
    const res = await api.post("/auth/signin", { json: { email: "a@b.com", password: "wrong" } });
    expect(res.status).toBe(401);
  });

  test("POST /auth/signin rejects unknown email", async () => {
    const res = await api.post("/auth/signin", { json: { email: "unknown@b.com", password: "any" } });
    expect(res.status).toBe(401);
  });

  test("POST /auth/signup rejects malformed email", async () => {
    const res = await api.post("/auth/signup", { json: { email: "not-an-email", password: "password123" } });
    expect(res.status).toBe(400);
  });
});
```

- [x] **Step 2: Run auth negative-path tests**

Run: `bun test apps/bff/src/routes/auth.test.ts`
Expected: PASS

- [x] **Step 3: Write negative-path tests for projects.test.ts and runs.test.ts**

Add tests for:
- `GET /projects` without session → 401
- `POST /projects` with malformed payload → 400
- `GET /projects/:id/runs` without session → 401

- [x] **Step 4: Run all route tests**

Run: `bun test apps/bff/src/routes/projects.test.ts apps/bff/src/routes/runs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/bff/src/routes/auth.test.ts apps/bff/src/routes/projects.test.ts apps/bff/src/routes/runs.test.ts
git commit -m "test(bff): add route negative-path coverage"
```

---

## Chunk 3: Restore `useAuth` Behavioral Coverage

### Task 5: Recreate `use-auth.test.tsx`

**Files:**
- Create: `apps/web/src/auth/use-auth.test.tsx`
- Reference: `apps/web/src/auth/use-auth.ts` and `apps/web/src/auth/client.ts`

- [ ] **Step 1: Write failing test for all useAuth state transitions**

```typescript
describe("useAuth state machine", () => {
  test("starts in pending state", () => {
    // Render useAuth without session
    expect(state).toBe("pending");
  });

  test("transitions to authenticated on valid session", async () => {
    // Mock Better Auth client with valid session
    // Render useAuth
    // Expect state "authenticated" and user object
  });

  test("transitions to error on invalid session", async () => {
    // Mock Better Auth client throwing on getSession
    // Render useAuth
    // Expect state "error"
  });

  test("transitions to signed_out after signOut", async () => {
    // Start authenticated
    // Call signOut()
    // Expect state "signed_out"
  });

  test("signOut error is handled gracefully", async () => {
    // Mock signOut throwing
    // Render useAuth
    // Call signOut()
    // Error should be caught, state should not crash
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test apps/web/src/auth/use-auth.test.tsx`
Expected: FAIL (file doesn't exist yet or tests not written)

- [ ] **Step 3: Implement minimal hook to make tests pass**

- [ ] **Step 4: Run tests to verify pass**

Run: `bun test apps/web/src/auth/use-auth.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/auth/use-auth.test.tsx
git commit -m "test(web): recreate useAuth state machine tests"
```

### Task 6: Update `App.auth.test.tsx` with full auth flow coverage

**Files:**
- Modify: `apps/web/src/App.auth.test.tsx`

- [ ] **Step 1: Write test for App-level auth flow**

```typescript
describe("App auth flows", () => {
  test("unauthenticated user sees login/signup", () => {});
  test("authenticated user sees main app", () => {});
  test("logout redirects to login", () => {});
});
```

- [ ] **Step 2: Run tests**

Run: `bun test apps/web/src/App.auth.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/App.auth.test.tsx
git commit -m "test(web): extend App auth flow coverage"
```

---

## Chunk 4: Remove `any` Casts from Route Context

### Task 7: Replace `(c as any)` with typed context in `projects.ts` and `runs.ts`

**Files:**
- Modify: `apps/bff/src/routes/projects.ts`
- Modify: `apps/bff/src/routes/runs.ts`

- [x] **Step 1: Read current type issues in projects.ts and runs.ts**

Run: `grep -n "as any" apps/bff/src/routes/projects.ts apps/bff/src/routes/runs.ts`

- [ ] **Step 2: Fix type issue by using proper context access pattern**

The Hono `Context` type issue with `c.json({}, 422)` is because `422` is not assignable to `ContentfulStatusCode`. Use an intermediate variable:

```typescript
const status = 422 as const;
// or use: (c as any).json({ message: "..." }, 422);
// Preferred: define typed response helper
```

For `authUser` access, ensure `c.get("authUser")` returns `BetterAuthApp` type correctly.

- [ ] **Step 3: Verify TypeScript compiles with no errors**

Run: `bun tsc --noEmit -p apps/bff/tsconfig.json`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/bff/src/routes/projects.ts apps/bff/src/routes/runs.ts
git commit -m "fix(types): remove any casts from route context"
```

---

## Chunk 5: Schema/Migration Parity + Migration Safety Docs

### Task 8: Add FK declaration for `users.projectId` in schema

**Files:**
- Modify: `packages/db/src/schema/users.ts`

- [ ] **Step 1: Read current users.ts schema**

```bash
cat packages/db/src/schema/users.ts
```

- [ ] **Step 2: Add FK relationship for projectId**

```typescript
export const users = pgTable("users", {
  // ... existing fields
  projectId: text("project_id").references(() => projects.id),
});
```

- [ ] **Step 3: Update schema.test.ts to verify FK behavior**

- [ ] **Step 4: Run schema tests**

Run: `bun test packages/db/src/schema/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/users.ts packages/db/src/schema/schema.test.ts
git commit -m "fix(schema): add FK for users.project_id"
```

### Task 9: Document migration irreversibility in DEVELOPMENT.md

**Files:**
- Modify: `docs/DEVELOPMENT.md`

- [x] **Step 1: Read current DEVELOPMENT.md**

```bash
cat docs/DEVELOPMENT.md
```

- [x] **Step 2: Add migration safety section**

```markdown
## Migration Safety

### Irreversible Migrations

The following migrations perform DROP COLUMN and are NON-REVERSIBLE:

- `0003_drop_legacy_auth_columns.sql` — drops `password_hash` and `team_id`
  - **Risk:** Data loss. Cannot be undone without a full DB restore.
  - **Mitigation:** Ensure all applications are using Better Auth before applying.
  - **Rollback:** Full DB snapshot restore required.

### Best Practices

- Always test migrations on a snapshot first
- No migration should be applied without a verified working backup
```

- [x] **Step 3: Commit**

```bash
git add docs/DEVELOPMENT.md
git commit -m "docs: add migration safety documentation"
```

---

## Chunk 6: Compose Stack Robustness

### Task 10: Fix `BETTER_AUTH_URL` hostname in compose test stack

**Files:**
- Modify: `compose.test.bff.yml`

- [x] **Step 1: Read compose.test.bff.yml**

```bash
cat compose.test.bff.yml
```

- [x] **Step 2: Check current service name for bff-tests**

The compose file uses `bff-tests` as the service name but `BETTER_AUTH_URL=http://bff:3001`. The correct service name inside the compose network should be the actual service name. Since the reviewer flagged `bff` vs `bff-tests` mismatch, verify and fix:

```yaml
environment:
  BETTER_AUTH_URL: http://bff-tests:3001  # must match the service name in compose network
```

- [ ] **Step 3: Run compose BFF tests to verify**

Run: `podman compose -f compose.yml -f compose.test.bff.yml up --abort-on-container-exit --exit-code-from bff-tests bff-tests`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add compose.test.bff.yml
git commit -m "fix(compose): correct BETTER_AUTH_URL hostname in BFF test stack"
```

---

## Final Gate

Before claiming completion, run all three verification commands:

- [x] **Step 1: Unit tests**

Run: `bun test`
Expected: PASS (all 70+ tests)

- [ ] **Step 2: Compose BFF stack**

Run: `podman compose -f compose.yml -f compose.test.bff.yml up --abort-on-container-exit --exit-code-from bff-tests bff-tests`
Expected: PASS (all tests)

- [ ] **Step 3: Compose Web stack**

Run: `podman compose -f compose.yml -f compose.test.web.yml up --abort-on-container-exit --exit-code-from web-tests web-tests`
Expected: PASS (all tests)

- [ ] **Step 4: Diff vs dev**

Run: `git diff dev...HEAD`
Expected: All hardening commits present

- [ ] **Step 5: Request review**

Dispatch `@review` subagent with: "Hardening complete. All 6 tasks done. Reviewer flags addressed."

---

## File Summary

| Task | Files |
|------|-------|
| 1 | `apps/bff/src/auth/better-auth.ts` |
| 2 | `apps/bff/src/routes/auth.integration.test.ts` |
| 3 | `apps/bff/src/routes/auth.integration.test.ts` |
| 4 | `apps/bff/src/routes/auth.test.ts`, `projects.test.ts`, `runs.test.ts` |
| 5 | `apps/web/src/auth/use-auth.test.tsx` |
| 6 | `apps/web/src/App.auth.test.tsx` |
| 7 | `apps/bff/src/routes/projects.ts`, `runs.ts` |
| 8 | `packages/db/src/schema/users.ts`, `schema.test.ts` |
| 9 | `docs/DEVELOPMENT.md` |
| 10 | `compose.test.bff.yml` |
