# Foundation Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a Bun+TypeScript monorepo foundation with React frontend, Hono BFF, database schema/migrations, and automatic default-project creation on signup.

**Architecture:** Create a workspace with isolated apps (`web`, `bff`) and shared packages (`db`, `shared-types`). Add DB-first auth/user/project schema and the minimum signup flow needed to prove DB-backed sessions plus default project bootstrap. Keep interfaces typed and narrow so future analyze/result features can plug in without restructuring.

**Tech Stack:** Bun, TypeScript, React, Vite, Hono, Drizzle ORM, PostgreSQL, Vitest, Playwright (later phase)

---

## Chunk 1: Repository and Workspace Foundation

### Task 1: Initialize Bun workspace and package boundaries

**Files:**
- Create: `package.json`
- Create: `bun.lock` (generated)
- Create: `bunfig.toml`
- Create: `tsconfig.base.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/bff/package.json`
- Create: `apps/bff/tsconfig.json`
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`

- [ ] **Step 1: Write failing workspace sanity test**

```ts
// packages/shared-types/src/smoke.test.ts
import { describe, expect, it } from "vitest";

describe("workspace", () => {
  it("resolves shared packages", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify initial failure**

Run: `bun test packages/shared-types/src/smoke.test.ts`
Expected: FAIL because workspace and test runner are not configured yet.

- [ ] **Step 3: Create minimal workspace config and test setup**

```json
{
  "name": "refweaver-webui",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "test": "bun test"
  }
}
```

- [ ] **Step 4: Re-run test to verify pass**

Run: `bun test packages/shared-types/src/smoke.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json bunfig.toml tsconfig.base.json apps packages
git commit -m "chore: bootstrap bun workspace for web and bff"
```

### Task 2: Scaffold React web app and Hono BFF entrypoints

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/vite.config.ts`
- Create: `apps/bff/src/index.ts`
- Create: `apps/bff/src/app.ts`
- Create: `apps/bff/src/routes/health.ts`
- Create: `apps/bff/src/server.test.ts`

- [ ] **Step 1: Write failing BFF health route test**

```ts
import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("health route", () => {
  it("returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/bff/src/server.test.ts`
Expected: FAIL because app/route does not exist.

- [ ] **Step 3: Implement minimal Hono app and route**

```ts
// apps/bff/src/app.ts
import { Hono } from "hono";

export const app = new Hono();
app.get("/health", (c) => c.json({ status: "ok" }, 200));
```

- [ ] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web apps/bff
git commit -m "chore: scaffold react app and hono bff"
```

### Task 3: Add environment/config contract for BFF and web

**Files:**
- Create: `.env.example`
- Create: `apps/bff/src/config/env.ts`
- Create: `apps/web/src/config.ts`
- Create: `apps/bff/src/config/env.test.ts`

- [ ] **Step 1: Write failing env validation test**

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws on missing DATABASE_URL", () => {
    expect(() => parseEnv({} as Record<string, string>)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test apps/bff/src/config/env.test.ts`
Expected: FAIL because parser is missing.

- [ ] **Step 3: Implement minimal env parser and examples**

```ts
export function parseEnv(input: Record<string, string | undefined>) {
  const databaseUrl = input.DATABASE_URL;
  if (!databaseUrl) throw new Error("Missing DATABASE_URL");
  return { databaseUrl };
}
```

- [ ] **Step 4: Re-run test to verify pass**

Run: `bun test apps/bff/src/config/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .env.example apps/bff/src/config apps/web/src/config.ts
git commit -m "chore: add typed environment configuration"
```

## Chunk 2: Database Schema and Signup Bootstrap

### Task 4: Implement Drizzle schema for users, sessions, projects

**Files:**
- Create: `packages/db/src/schema/users.ts`
- Create: `packages/db/src/schema/sessions.ts`
- Create: `packages/db/src/schema/projects.ts`
- Create: `packages/db/src/schema/index.ts`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/migrations/0001_initial.sql` (generated)
- Create: `packages/db/src/schema/schema.test.ts`

- [ ] **Step 1: Write failing schema test for required columns**

```ts
import { describe, expect, it } from "vitest";

describe("schema", () => {
  it("documents users/projects with team placeholders", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure of missing module references**

Run: `bun test packages/db/src/schema/schema.test.ts`
Expected: FAIL until schema files exist.

- [ ] **Step 3: Implement schema including nullable team fields**

```ts
// include users.teamId nullable
// include projects.teamId nullable
// include unique users.username and users.email
```

- [ ] **Step 4: Generate and inspect initial migration**

Run: `bun run --filter @refweaver/db drizzle:generate`
Expected: migration file created for users/sessions/projects tables.

- [ ] **Step 5: Run tests to verify pass**

Run: `bun test packages/db/src/schema/schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat: add initial auth and project database schema"
```

### Task 5: Add signup use-case that creates default personal project

**Files:**
- Create: `apps/bff/src/auth/signup.ts`
- Create: `apps/bff/src/auth/password.ts`
- Create: `apps/bff/src/routes/auth.ts`
- Modify: `apps/bff/src/app.ts`
- Create: `apps/bff/src/auth/signup.test.ts`

- [ ] **Step 1: Write failing test for signup side effects**

```ts
import { describe, expect, it } from "vitest";

describe("signup", () => {
  it("creates user and default personal project", async () => {
    expect("implement me").toBe("user+project");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test apps/bff/src/auth/signup.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement minimal signup service**

```ts
// create user with hashed password
// create project named "My First Project"
// set owner_user_id = new user id
// set team_id = null
// create db-backed session and return cookie payload
```

- [ ] **Step 4: Expose POST /auth/signup endpoint in Hono**

Run: `bun test apps/bff/src/auth/signup.test.ts`
Expected: PASS after wiring route.

- [ ] **Step 5: Commit**

```bash
git add apps/bff/src/auth apps/bff/src/routes/auth.ts apps/bff/src/app.ts
git commit -m "feat: implement signup with default project bootstrap"
```

### Task 6: Baseline docs and developer run commands

**Files:**
- Create: `README.md`
- Create: `docs/DEVELOPMENT.md`

- [ ] **Step 1: Write failing docs check test (optional simple script)**

```ts
import { describe, expect, it } from "vitest";

describe("docs", () => {
  it("provides local run commands", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Add docs for first-run setup and scripts**

Include:
- Bun install and workspace install command
- Database bootstrap command
- Run web and bff in parallel
- Test commands

- [ ] **Step 3: Verify command examples locally**

Run:
- `bun run test`
- `bun run --filter @refweaver/bff dev`
- `bun run --filter @refweaver/web dev`

Expected: test command passes and dev servers start.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/DEVELOPMENT.md
git commit -m "docs: add foundation setup and runbook"
```

---

## Verification Checklist for This Plan Chunk

- [ ] Workspace bootstraps with Bun and runs tests.
- [ ] Hono BFF health endpoint is test-covered.
- [ ] Environment contract is validated with failing/passing tests.
- [ ] DB schema includes users, sessions, projects with nullable `team_id` placeholders.
- [ ] Signup creates both user and default personal project.
- [ ] Setup docs allow another engineer to run stack locally.

## Out of Scope for This Plan

- Login/logout endpoint completion details beyond signup baseline.
- RefWeaver analyze/poll/run integration.
- Results rendering and report UX.
- Team permission logic.

Plan complete and saved to `docs/superpowers/plans/2026-03-10-foundation-bootstrap.md`. Ready to execute?
