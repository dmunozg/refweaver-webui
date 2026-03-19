# Milestone 3 Domain APIs Verification

Date: 2026-03-12

Scope note: This branch retains compose/CORS hardening because Milestone 3 validation requires stable remote-dev access and BFF-to-RefWeaver connectivity in containerized local environments.

## Commands

```bash
bun test apps/bff/src/routes/projects.test.ts apps/bff/src/routes/runs.test.ts apps/bff/src/routes/projects.integration.test.ts apps/bff/src/routes/runs.integration.test.ts
bun test apps/bff/src/projects/service.test.ts apps/bff/src/projects/store.test.ts apps/bff/src/runs/service.test.ts apps/bff/src/runs/store.test.ts apps/bff/src/refweaver/client.test.ts
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/refweaver_webui_test bun test
podman compose -f compose.yml config
```

## Results

- Focused Milestone 3 suite: PASS (`31 pass`, `0 fail`).
- Full repository suite: PASS (`107 pass`, `0 fail`).
- Compose config render: PASS (services resolve with required env values).

## Additional smoke evidence

- Auth signup and project creation via BFF: PASS (`201` on `/auth/signup`, `201` on `/projects`).
- Run submission and polling via BFF with 1-sentence input: PASS (`202` submit, `200` poll with `finished`).
- Operational note: inside compose containers, `REFWEAVER_API_BASE_URL` must target host-reachable DNS (`host.containers.internal`) rather than `localhost`.

## Migration safety remediation (PR 1)

- Baseline migration `packages/db/migrations/0000_nebulous_dreadnoughts.sql` is now frozen to milestone-0 foundations only.
- Milestone 3 schema changes now ship through forward migration `packages/db/migrations/0001_little_daimon_hellstrom.sql` (`projects.deleted_at`, `analysis_runs`, FK/index set).
- Forward migration now deterministically de-dupes legacy duplicate (`user_id`, `refweaver_job_id`) rows by preserving the earliest row (`created_at`, then `id`) and nulling later duplicates before creating the unique index.
- Deterministic per-user job lookup has DB enforcement via partial unique index `analysis_runs_user_job_unique_idx` on (`user_id`, `refweaver_job_id`) when `refweaver_job_id IS NOT NULL`.
- Migration test harness now executes SQL files in Drizzle journal order (`packages/db/migrations/meta/_journal.json`) and fails loudly with file + statement diagnostics plus SQL preview for unexpected migration SQL errors.
- Legacy-upgrade coverage now seeds a more realistic historical object footprint (pre-existing `projects.deleted_at`, analysis-runs FK/index objects, duplicate rows) before applying `0001`, then verifies deterministic dedupe + unique-index enforcement.

### PR 1 verification commands

```bash
bun test packages/db/src/schema/schema.test.ts
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/refweaver_webui_test bun test apps/bff/src/routes/auth.integration.test.ts
```

### PR 1 verification results

- DB schema unit tests: PASS (`3 pass`, `0 fail`).
- Auth integration suite with true upgrade-path migration simulation + uniqueness assertions: PASS (`8 pass`, `0 fail`).
