# Analysis Runs Title Forward Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore database migration safety by adding `analysis_runs.title` in a new forward-only migration, without rewriting historical migrations.

**Architecture:** Keep migration history immutable and add a compensating migration that applies the missing schema change for already-migrated databases. Update the migration journal/snapshot metadata so new environments and existing environments both converge on the same schema state.

**Tech Stack:** PostgreSQL, Drizzle Kit, TypeScript, Bun

---

## Chunk 1: Add forward migration for `analysis_runs.title`

### Task 1: Create new migration file

**Files:**
- Create: `packages/db/migrations/0002_analysis_runs_title.sql`
- Modify: `packages/db/migrations/meta/_journal.json`
- Create: `packages/db/migrations/meta/0002_snapshot.json`

- [ ] **Step 1: Write the failing migration regression test or verification step**

Add a schema/migration check that would fail on an environment that only had `0001` applied without the new forward migration. If no automated migration harness exists, add a tiny verification note/test to assert `analysis_runs.title` is present after the migration set is applied.

- [ ] **Step 2: Run the check to confirm the missing-column state fails**

Run: `bun test packages/db/src/schema/schema.test.ts`
Expected: schema test still passes against code, but the plan requires a migration-path check to fail on old DB state if you have a database harness available.

- [ ] **Step 3: Add the forward-only migration SQL**

```sql
ALTER TABLE "analysis_runs" ADD COLUMN IF NOT EXISTS "title" text;
```

- [ ] **Step 4: Update journal and snapshot metadata**

Add a new journal entry for `0002_analysis_runs_title` and generate or author `0002_snapshot.json` so the migration chain reflects the new schema state.

- [ ] **Step 5: Verify migration files are consistent**

Run: `bun run --filter @refweaver/db drizzle:generate`
Expected: either no diff or a controlled migration metadata update consistent with `0002`.

- [ ] **Step 6: Commit**

```bash
git add packages/db/migrations/0002_analysis_runs_title.sql packages/db/migrations/meta/_journal.json packages/db/migrations/meta/0002_snapshot.json
git commit -m "fix(db): add forward migration for analysis run titles"
```

## Chunk 2: Verify schema compatibility

### Task 2: Confirm schema/tests still pass

**Files:**
- Modify: `packages/db/src/schema/schema.test.ts` (only if a migration-path assertion is added)
- Test: `packages/db/src/schema/schema.test.ts`
- Test: `apps/bff/src/runs/service.test.ts`
- Test: `apps/bff/src/runs/store.test.ts`

- [ ] **Step 1: Write or adjust a migration-path assertion**

If you add a migration test harness, assert that applying migrations on a database that already ran `0001` now yields `analysis_runs.title`.

- [ ] **Step 2: Run the schema and BFF tests**

Run: `bun test packages/db/src/schema/schema.test.ts apps/bff/src/runs/service.test.ts apps/bff/src/runs/store.test.ts`
Expected: PASS

- [ ] **Step 3: Commit verification-only updates**

```bash
git add packages/db/src/schema/schema.test.ts
git commit -m "test(db): cover analysis run title migration path"
```

## Chunk 3: Documentation note

### Task 3: Document forward migration policy

**Files:**
- Modify: `docs/DEVELOPMENT.md`

- [ ] **Step 1: Add a short note about forward-only migrations**

Explain that `analysis_runs.title` was restored via a new migration rather than rewriting historical SQL.

- [ ] **Step 2: Commit docs update**

```bash
git add docs/DEVELOPMENT.md
git commit -m "docs: note forward migration for analysis run titles"
```
