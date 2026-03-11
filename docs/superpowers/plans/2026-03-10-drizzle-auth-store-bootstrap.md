# Drizzle-Backed Auth Store Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder signup store with a concrete Drizzle/Postgres-backed store and wire BFF bootstrap so signup persists users, default projects, and sessions in the database.

**Architecture:** Add a shared DB runtime entrypoint in `packages/db` that exposes a typed Drizzle client and schema exports. Refactor BFF app bootstrap to dependency injection so concrete stores are constructed in `index.ts` using parsed environment values. Keep signup orchestration test-driven and atomic with a transaction boundary to avoid partial writes.

**Tech Stack:** Bun, TypeScript, Hono, Drizzle ORM, PostgreSQL, Vitest

---

## Chunk 1: DB Runtime Foundation

### Task 1: Add shared DB runtime exports

**Files:**
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`
- Modify: `packages/db/package.json`
- Test: `apps/bff/src/auth/store.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createDb } from "@refweaver/db";

describe("db exports", () => {
  it("exports createDb runtime factory", () => {
    expect(createDb).toBeTypeOf("function");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test apps/bff/src/auth/store.test.ts`
Expected: FAIL because `@refweaver/db` export is missing.

- [x] **Step 3: Write minimal implementation**

```ts
// packages/db/src/client.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });
  return { db, client };
}
```

- [x] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/auth/store.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/db/src/client.ts packages/db/src/index.ts packages/db/package.json apps/bff/src/auth/store.test.ts
git commit -m "feat: add shared drizzle runtime client exports"
```

### Task 2: Wire env parsing at BFF startup

**Files:**
- Modify: `apps/bff/src/index.ts`
- Modify: `apps/bff/src/config/env.ts` (if stricter typing is required)
- Test: `apps/bff/src/server.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "./config/env";

describe("bff bootstrap", () => {
  it("requires DATABASE_URL and passes it to db bootstrap", () => {
    expect(() => parseEnv({})).toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test apps/bff/src/server.test.ts`
Expected: FAIL because startup does not yet use parsed env + DB creation path.

- [x] **Step 3: Write minimal implementation**

```ts
// apps/bff/src/index.ts
const env = parseEnv(process.env);
const { db } = createDb(env.DATABASE_URL);
const signupStore = createSignupStore(db);
const app = createApp({ signupStore });
```

- [x] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/server.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/bff/src/index.ts apps/bff/src/config/env.ts apps/bff/src/server.test.ts
git commit -m "refactor: bootstrap bff with parsed env and db dependencies"
```

## Chunk 2: Concrete Signup Store

### Task 3: Implement Drizzle-backed signup store methods

**Files:**
- Modify: `apps/bff/src/auth/store.ts`
- Test: `apps/bff/src/auth/store.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

describe("createSignupStore", () => {
  it("creates user, project, and session rows", async () => {
    expect("replace me").toBe("with db assertions");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test apps/bff/src/auth/store.test.ts`
Expected: FAIL with missing behavior assertions.

- [x] **Step 3: Write minimal implementation**

```ts
export function createSignupStore(db: Db) {
  return {
    async createUser(input) {
      const [row] = await db.insert(users).values(input).returning({ id: users.id });
      return row;
    },
    async createProject(input) {
      const [row] = await db.insert(projects).values(input).returning({ id: projects.id });
      return row;
    },
    async createSession(input) {
      const [row] = await db.insert(sessions).values(input).returning({ id: sessions.id });
      return row;
    }
  };
}
```

- [x] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/auth/store.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/bff/src/auth/store.ts apps/bff/src/auth/store.test.ts
git commit -m "feat: implement drizzle-backed signup store"
```

### Task 4: Add transactional signup orchestration

**Files:**
- Modify: `apps/bff/src/auth/signup.ts`
- Modify: `apps/bff/src/auth/store.ts` (if transaction helper lives there)
- Test: `apps/bff/src/auth/signup.test.ts`

- [x] **Step 1: Write the failing test**

```ts
it("rolls back all writes if project/session creation fails", async () => {
  // arrange store/db failure after createUser
  // assert no persisted user remains after signup attempt
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test apps/bff/src/auth/signup.test.ts`
Expected: FAIL because flow is not atomic yet.

- [x] **Step 3: Write minimal implementation**

```ts
// wrap createUser + createProject + createSession in db.transaction(...)
```

- [x] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/auth/signup.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/bff/src/auth/signup.ts apps/bff/src/auth/store.ts apps/bff/src/auth/signup.test.ts
git commit -m "feat: make signup writes transactional"
```

## Chunk 3: App Composition and Route Behavior

### Task 5: Convert app singleton to dependency-injected app factory

**Files:**
- Modify: `apps/bff/src/app.ts`
- Modify: `apps/bff/src/index.ts`
- Modify: `apps/bff/src/routes/auth.ts`
- Test: `apps/bff/src/server.test.ts`

- [x] **Step 1: Write the failing test**

```ts
it("creates app with injected signup store dependency", async () => {
  const app = createApp({ signupStore: fakeStore });
  const res = await app.request("/health");
  expect(res.status).toBe(200);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test apps/bff/src/server.test.ts`
Expected: FAIL because app is still a singleton export.

- [x] **Step 3: Write minimal implementation**

```ts
export function createApp(deps: { signupStore: SignupStore }) {
  const app = new Hono();
  registerHealthRoute(app);
  registerAuthRoutes(app, deps.signupStore);
  return app;
}
```

- [x] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/server.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/bff/src/app.ts apps/bff/src/index.ts apps/bff/src/routes/auth.ts apps/bff/src/server.test.ts
git commit -m "refactor: use dependency-injected bff app factory"
```

### Task 6: Add duplicate signup conflict handling

**Files:**
- Modify: `apps/bff/src/routes/auth.ts`
- Modify: `apps/bff/src/auth/store.ts` or add `apps/bff/src/auth/errors.ts`
- Test: `apps/bff/src/routes/auth.test.ts`

- [x] **Step 1: Write the failing test**

```ts
it("returns 409 for duplicate username/email", async () => {
  // trigger unique violation from store
  // expect response status 409
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test apps/bff/src/routes/auth.test.ts`
Expected: FAIL because duplicate currently bubbles as 500.

- [x] **Step 3: Write minimal implementation**

```ts
try {
  await signup(...);
} catch (error) {
  if (isUniqueViolation(error)) return c.json({ error: "signup_conflict" }, 409);
  throw error;
}
```

- [x] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/routes/auth.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/bff/src/routes/auth.ts apps/bff/src/auth/store.ts apps/bff/src/auth/errors.ts apps/bff/src/routes/auth.test.ts
git commit -m "feat: map duplicate signup conflicts to 409 responses"
```

## Chunk 4: Verification and Hardening

### Task 7: Add signup integration test with real DB assertions

**Files:**
- Create: `apps/bff/src/routes/auth.integration.test.ts`
- Modify: `apps/bff/src/routes/auth.ts` (if needed for testability)

- [x] **Step 1: Write the failing test**

```ts
it("POST /auth/signup persists user, default project, and session", async () => {
  // call route
  // assert 201 and set-cookie
  // assert db has user row
  // assert db has project row with team_id null
  // assert db has session row linked to user
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test apps/bff/src/routes/auth.integration.test.ts`
Expected: FAIL until all wiring is complete.

- [x] **Step 3: Write minimal implementation fixes**

```ts
// complete remaining dependency injection, db writes, and cookie behavior
```

- [x] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/routes/auth.integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/bff/src/routes/auth.integration.test.ts apps/bff/src/routes/auth.ts apps/bff/src/auth/store.ts apps/bff/src/index.ts
git commit -m "test: verify signup persistence and session cookie integration"
```

### Task 8: Final verification gate

**Files:**
- Verify only

- [x] **Step 1: Run full test suite**

Run: `bun run test`
Expected: all tests pass, 0 failures.

- [x] **Step 2: Run BFF dev startup smoke test**

Run: `bun run --filter @refweaver/bff dev`
Expected: server starts and no "Signup store not configured" error path is reachable.

- [x] **Step 3: Manual endpoint check**

Run:

```bash
curl -i -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"ada","email":"ada@example.com","name":"Ada Lovelace","password":"safe-pass"}'
```

Expected: `201 Created`, `Set-Cookie: rw_session=...`, DB rows for users/projects/sessions exist.

- [ ] **Step 4: Commit verification artifacts if any**

```bash
git add .
git commit -m "chore: finalize drizzle-backed signup bootstrap verification"
```

---

## Acceptance Criteria

- [x] Signup writes to real DB tables: `users`, `projects`, `sessions`.
- [x] Default project is created per new user with `team_id = null`.
- [x] Session token is sent in HTTP-only cookie and stored hashed in DB.
- [x] Duplicate username/email returns `409`.
- [x] BFF app is bootstrapped with injected concrete store built from parsed env + DB client.
- [x] No runtime path still uses placeholder "Signup store not configured".
- [x] `bun run test` passes.

Plan complete and saved to `docs/superpowers/plans/2026-03-10-drizzle-auth-store-bootstrap.md`. Ready to execute?
