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
