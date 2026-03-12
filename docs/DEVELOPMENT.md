# Development Guide

## Prerequisites

- Bun 1.3+
- PostgreSQL 15+

## Environment

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `SESSION_SECRET`, and `REFWEAVER_API_BASE_URL`.

## Podman Compose (Recommended)

1. Copy `.env.example` to `.env`.
2. Set at minimum:
   - `SESSION_SECRET`
   - `REFWEAVER_API_BASE_URL` (required)

Optional host exposure controls:
- `WEB_BIND_ADDRESS` (defaults to `127.0.0.1` to keep web port loopback-only)
- `VITE_ALLOWED_HOSTS` (defaults to `localhost,127.0.0.1`)
- `BFF_ALLOWED_ORIGINS` (defaults to `http://localhost:5173,http://127.0.0.1:5173`)

For remote access (for example over Tailscale), you must configure both:
- `VITE_ALLOWED_HOSTS` to include the web hostname (for example `vesuvio3`)
- `BFF_ALLOWED_ORIGINS` to include the full web origin (for example `http://vesuvio3:5173`)

Example:

```env
VITE_ALLOWED_HOSTS=localhost,127.0.0.1,vesuvio3
BFF_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://vesuvio3:5173
```

Start the local development stack:

```bash
podman compose up --build
```

Expected default endpoints:
- Web: `http://localhost:${WEB_PORT}` (default `5173`)
- BFF: `http://localhost:${BFF_PORT}` (default `3001`)
- BFF health: `http://localhost:${BFF_PORT}/health`

Note: Postgres is intentionally not published to the host. It is reachable only by compose services via `db:5432`.

Stop the stack:

```bash
podman compose down
```

Stop and remove DB volume:

```bash
podman compose down -v
```

## Database

Generate migrations from schema:

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/refweaver_webui" bun run --filter @refweaver/db drizzle:generate
```

## Run Apps

Run BFF:

```bash
bun run --filter @refweaver/bff dev
```

Run Web app:

```bash
bun run --filter @refweaver/web dev
```

## Tests

Run all tests:

```bash
bun run test
```
