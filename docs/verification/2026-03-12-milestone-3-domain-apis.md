# Milestone 3 Domain APIs Verification

Date: 2026-03-12

## Commands

```bash
bun test apps/bff/src/routes/projects.test.ts apps/bff/src/routes/runs.test.ts apps/bff/src/routes/projects.integration.test.ts apps/bff/src/routes/runs.integration.test.ts
bun test apps/bff/src/projects/service.test.ts apps/bff/src/projects/store.test.ts apps/bff/src/runs/service.test.ts apps/bff/src/runs/store.test.ts apps/bff/src/refweaver/client.test.ts
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/refweaver_webui_test bun test
podman compose -f compose.yml config
```

## Expected

- Route tests pass for project and run lifecycle endpoints.
- Integration tests pass for create/archive/restore and run submit/poll lifecycle.
- Unit tests pass for project service/store, run service/store, and RefWeaver client mapping.
- Full repository test suite passes with local test database URL override.
- Compose config resolves successfully.
