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

Start the local development stack:

```bash
podman compose up --build
```

Expected default endpoints:
- Web: `http://localhost:${WEB_PORT}` (default `5173`)
- BFF: `http://localhost:${BFF_PORT}` (default `3001`)
- BFF health: `http://localhost:${BFF_PORT}/health`
- Postgres: `localhost:${POSTGRES_PORT}` (default `5432`)

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
