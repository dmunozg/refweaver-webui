# Milestone 2 Frontend Review Mitigation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all validated spec-review and code-quality findings for Milestone 2 frontend auth work on branch `feat/m2-frontend-auth-shell`.

**Architecture:** Keep the current `useAuth` + API module structure, but improve reliability by preserving error classes, hardening logout semantics, and adding behavior-level tests. Resolve spec/process mismatches by aligning plan expectations and implementation details.

**Tech Stack:** Bun, TypeScript, React, Vitest

---

## Checklist of Validated Findings

- [ ] Task 6 plan/implementation mismatch: `apps/web/src/main.tsx` listed but unchanged.
- [ ] Task 7 tests do not fully cover success-path behavior.
- [ ] Protected app shell is minimal and needs explicit scope/acceptance alignment.
- [ ] Frontend error-class fidelity is weak (errors collapsed too aggressively).
- [ ] Verification evidence is mostly conversational; repo-level artifacting can be improved.
- [ ] Login failure UX is misleading for non-credential failures.
- [ ] Logout request does not enforce `response.ok`.
- [ ] Logout click path does not handle async failures visibly.
- [ ] Auth tests are shallow for interaction/state-transition behavior.
- [ ] String-based error signaling is brittle.
- [ ] Duplicate-submit guard for login form can be improved.
- [ ] A11y improvements pending (`aria-live`, autocomplete, required hints).

## Short Mitigation Plan

### Task 1: Align plan and scope expectations

**Why this is needed:** The current plan and implementation diverge (for example, Task 6 lists `main.tsx` changes that were not required), which creates false failures in spec reviews and obscures real gaps.

**Files:**
- Modify: `docs/superpowers/plans/2026-03-11-milestone-2-auth-session-core.md`
- Modify: `docs/superpowers/specs/2026-03-10-refweaver-webui-roadmap.md` (if shell scope text needs clarification)

- [x] Step 1: Update Task 6 file list to match actual architecture or add explicit `main.tsx` integration if required.
- [x] Step 2: Clarify what counts as Milestone 2 “protected app shell” minimal acceptance.
- [ ] Step 3: Commit.

### Task 2: Harden auth API error semantics

**Why this is needed:** Error conditions are currently collapsed into generic outcomes, which loses fidelity between credential errors, server failures, and network failures, leading to misleading UX and weaker debugging signals.

**Files:**
- Modify: `apps/web/src/auth/api.ts`
- Modify: `apps/web/src/auth/types.ts` (introduce tagged error types/constants)
- Modify: `apps/web/src/auth/use-auth.ts`

- [ ] Step 1: Introduce typed/tagged auth error categories.
- [ ] Step 2: Preserve server/network distinctions for login/logout/me failures.
- [ ] Step 3: Make `logoutRequest` throw on non-2xx.
- [ ] Step 4: Commit.

### Task 3: Improve app-level UX reliability

**Why this is needed:** Logout and login flows do not consistently surface failure states to users, and submit behavior can allow avoidable reliability issues (duplicate submissions, silent async errors).

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/auth/LoginForm.tsx`

- [ ] Step 1: Handle logout errors explicitly (no fire-and-forget void path).
- [ ] Step 2: Differentiate invalid credentials vs generic login failures in UI.
- [ ] Step 3: Add duplicate-submit guard during in-flight login.
- [ ] Step 4: Add basic a11y enhancements (`aria-live`, `required`, autocomplete attrs).
- [ ] Step 5: Commit.

### Task 4: Deepen tests to behavior level

**Why this is needed:** Current frontend auth tests focus on shallow render checks and miss critical interaction/state-transition behavior, increasing regression risk.

**Files:**
- Modify: `apps/web/src/auth/LoginForm.test.tsx`
- Modify: `apps/web/src/auth/use-auth.test.ts`
- Create (if needed): `apps/web/src/App.auth.test.tsx`

- [ ] Step 1: Add success-path assertions for login form behavior.
- [ ] Step 2: Add non-401 bootstrap error path tests.
- [ ] Step 3: Add tests for submit guard and logout error handling.
- [ ] Step 4: Commit.

### Task 5: Verification artifacting

**Why this is needed:** Verification has been performed but not consistently captured as durable repository evidence, making review and audit trails weaker.

**Files:**
- Modify: `docs/superpowers/plans/2026-03-11-milestone-2-auth-session-core.md`
- Optional create: `docs/verification/2026-03-11-m2-frontend-auth.md`

- [ ] Step 1: Re-run frontend and full tests.
- [ ] Step 2: Add concise, durable verification notes with command + outcome.
- [ ] Step 3: Commit final checklist completion.

---

## Exit Criteria

- [ ] No important findings remain open from the latest spec + quality reviews.
- [ ] UI distinguishes credential errors from generic failures.
- [ ] Logout failures are surfaced and not silently ignored.
- [ ] Frontend auth tests cover success, failure, and state transitions.
- [ ] Plan/spec docs reflect the implemented scope accurately.
