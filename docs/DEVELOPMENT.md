# Development Guide

## Prerequisites

- Bun 1.3+
- PostgreSQL 15+

## Environment

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `SESSION_SECRET`, and `REFWEAVER_API_BASE_URL`.

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
