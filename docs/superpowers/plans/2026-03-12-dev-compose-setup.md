# Dev Compose and Env Contract Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev-oriented `compose.yml` that runs web, bff, and postgres together, and expand `.env.example` to document all user-configurable behavior.

**Architecture:** Use a single root `compose.yml` for local development with bind mounts and service dependencies. Keep it Podman/rootless friendly by avoiding Docker-only assumptions and require `REFWEAVER_API_BASE_URL` at compose startup via strict variable expansion.

**Tech Stack:** Podman Compose / Docker Compose, Bun, Vite, Hono, PostgreSQL

---

## Chunk 1: Environment Contract

### Task 1: Expand `.env.example` for compose + app runtime

**Files:**
- Modify: `.env.example`

- [x] **Step 1: Write failing validation check (manual diff expectation)**

Expected new variables documented in `.env.example`:
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `BFF_PORT`
- `WEB_PORT`
- `DATABASE_URL`
- `SESSION_SECRET`
- `REFWEAVER_API_BASE_URL` (blank by default)
- `REFWEAVER_API_KEY`
- `VITE_BFF_BASE_URL`

- [x] **Step 2: Verify current file is missing required compose-focused vars**

Run: `grep -n "POSTGRES_DB\|POSTGRES_USER\|POSTGRES_PASSWORD\|POSTGRES_PORT\|BFF_PORT\|WEB_PORT" .env.example`
Expected: missing entries (non-zero match completeness).

- [x] **Step 3: Update `.env.example` with full contract and comments**

Requirements:
- Keep `REFWEAVER_API_BASE_URL=` blank so users must set it.
- Use compose-service host (`db`) in default `DATABASE_URL`.
- Keep `VITE_BFF_BASE_URL` aligned to `BFF_PORT` default.

- [x] **Step 4: Re-verify env keys exist**

Run: `grep -n "POSTGRES_DB\|POSTGRES_USER\|POSTGRES_PASSWORD\|POSTGRES_PORT\|BFF_PORT\|WEB_PORT\|REFWEAVER_API_BASE_URL" .env.example`
Expected: all keys present.

- [x] **Step 5: Commit**

```bash
git add .env.example
git commit -m "chore: expand environment contract for dev compose"
```

## Chunk 2: Dev-Oriented Compose File

### Task 2: Add root `compose.yml` for web+bff+db

**Files:**
- Create: `compose.yml`

- [x] **Step 1: Write failing compose config check**

Run: `podman compose -f compose.yml config`
Expected: FAIL because file does not exist.

- [x] **Step 2: Create compose services and wiring**

Required service behavior:
- `db`
  - image: postgres
  - env from `POSTGRES_*`
  - named volume for persistence
  - healthcheck (`pg_isready`)
  - host port `${POSTGRES_PORT}`
- `bff`
  - image with bun runtime
  - command: dev server
  - bind mount project for live reload
  - depends_on `db` healthy
  - env includes required `REFWEAVER_API_BASE_URL: ${REFWEAVER_API_BASE_URL:?REFWEAVER_API_BASE_URL is required}`
  - host port `${BFF_PORT}`
- `web`
  - bun-based dev command for Vite
  - bind mount project for live reload
  - env includes `VITE_BFF_BASE_URL`
  - host port `${WEB_PORT}`

Constraints:
- Rootless/podman-friendly (no host network mode, no privileged settings).
- No Docker-only features.

- [x] **Step 3: Validate compose structure**

Run: `podman compose -f compose.yml config`
Expected: PASS when required vars are set in environment/.env.

- [x] **Step 4: Validate required var enforcement**

Run: `env -u REFWEAVER_API_BASE_URL podman compose -f compose.yml config`
Expected: FAIL with message that `REFWEAVER_API_BASE_URL` is required.

- [x] **Step 5: Commit**

```bash
git add compose.yml
git commit -m "feat: add podman-friendly dev compose stack"
```

## Chunk 3: Documentation and Verification

### Task 3: Add compose usage docs

**Files:**
- Modify: `docs/DEVELOPMENT.md`
- Optional Modify: `README.md`

- [x] **Step 1: Add Podman-first quickstart section**

Must include:
- copy env template
- set required values (`SESSION_SECRET`, `REFWEAVER_API_BASE_URL`)
- start stack (`podman compose up --build`)
- stop stack (`podman compose down` / `podman compose down -v`)

- [x] **Step 2: Add service endpoint expectations**

Expected defaults:
- web at `http://localhost:${WEB_PORT}`
- bff at `http://localhost:${BFF_PORT}`
- db at `localhost:${POSTGRES_PORT}`

- [x] **Step 3: Commit**

```bash
git add docs/DEVELOPMENT.md README.md
git commit -m "docs: add podman compose development workflow"
```

### Task 4: End-to-end compose verification gate

**Files:**
- Optional create: `docs/verification/2026-03-12-dev-compose-setup.md`

- [x] **Step 1: Bring stack up from compose**

Run: `podman compose up -d --build`
Expected: `db`, `bff`, `web` all running.

- [x] **Step 2: Verify health and reachability**

Run:
- `curl -i http://localhost:${BFF_PORT}/health`
- open/load `http://localhost:${WEB_PORT}`

Expected: BFF health `200`, web reachable.

- [x] **Step 3: Tear down stack**

Run: `podman compose down`
Expected: services stopped cleanly.

- [x] **Step 4: Record verification notes and commit**

```bash
git add docs/verification/2026-03-12-dev-compose-setup.md
git commit -m "test: verify podman compose dev stack startup"
```

---

## Exit Criteria

- [x] `compose.yml` runs web+bff+db in dev mode.
- [x] `REFWEAVER_API_BASE_URL` is mandatory at compose evaluation time.
- [x] `.env.example` fully documents configurable runtime and compose behavior.
- [x] Podman-focused docs are present and accurate.
- [x] Compose startup/health verification is documented.

Plan complete and saved to `docs/superpowers/plans/2026-03-12-dev-compose-setup.md`. Ready to execute?
