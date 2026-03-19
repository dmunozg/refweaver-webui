# Dev Compose Setup Verification

## Compose Validation

- `podman compose -f compose.yml config`
  - Result: PASS when `REFWEAVER_API_BASE_URL` is set.

- `env -u REFWEAVER_API_BASE_URL podman compose -f compose.yml config`
  - Result: FAIL as expected.
  - Error confirms `REFWEAVER_API_BASE_URL` is required.

## Stack Startup

Run:

```bash
REFWEAVER_API_BASE_URL="http://localhost:8000" SESSION_SECRET="dev-secret" podman compose up -d --build
```

Result: PASS.

Services running (`podman compose ps`):
- `db` on `0.0.0.0:5432`
- `bff` on `0.0.0.0:3001`
- `web` on `0.0.0.0:5173`

## Runtime Checks

- `curl -i http://localhost:3001/health`
  - Result: `HTTP/1.1 200 OK`
  - Body: `{"status":"ok"}`

- `curl -I http://localhost:5173`
  - Result: `HTTP/1.1 200 OK`

## Teardown

- `REFWEAVER_API_BASE_URL="http://localhost:8000" podman compose down`
  - Result: PASS, services stopped and network removed.
