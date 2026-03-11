# RefWeaver WebUI

Web client and Bun-powered BFF for the RefWeaver analysis API.

## Monorepo Packages

- `apps/web`: React + Vite frontend.
- `apps/bff`: Hono BFF for auth/session and RefWeaver integration.
- `packages/db`: Drizzle schema and migrations.
- `packages/shared-types`: shared runtime-safe type contracts.

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Copy env template and update values:

```bash
cp .env.example .env
```

3. Start services:

```bash
bun run --filter @refweaver/bff dev
bun run --filter @refweaver/web dev
```

4. Run tests:

```bash
bun run test
```
