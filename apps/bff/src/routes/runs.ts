import type { Hono } from "hono";
import type { BetterAuthApp } from "../auth/better-auth";
import { requireAuth } from "../middleware/require-auth";
import { toErrorResponse } from "../http/errors";
import { isUuid } from "../http/validation";
import type { createRunService } from "../runs/service";
import type { AuthVariables } from "../app";

type RunService = ReturnType<typeof createRunService>;

type AuthStore = BetterAuthApp;

// Typed status code constants — avoids repetitive `as const` casts on literals
const S = {
  OK: 200,
  ACCEPTED: 202,
  UNPROCESSABLE: 422,
} as const;

function getAuthUser(c: import("hono").Context<{ Variables: AuthVariables }>): { id: string } {
  return c.get("authUser");
}

export function registerRunRoutes(app: Hono<{ Variables: AuthVariables }>, authStore: AuthStore, runService: RunService): void {
  app.post("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const u = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, S.UNPROCESSABLE);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "validation_error", message: "Invalid JSON payload" } }, S.UNPROCESSABLE);
    }

    const input = body as { text?: unknown };
    if (typeof input.text !== "string") {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, S.UNPROCESSABLE);
    }

    const text = input.text.trim();
    if (!text) {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, S.UNPROCESSABLE);
    }

    try {
      const run = await runService.submitRun(u.id, projectId, text);
      return c.json({ run }, S.ACCEPTED);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const u = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, S.UNPROCESSABLE);
    }
    try {
      const runs = await runService.listRuns(u.id, projectId);
      return c.json({ runs }, S.OK);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/runs/:runId", requireAuth(authStore), async (c) => {
    const u = getAuthUser(c);
    const projectId = c.req.param("projectId");
    const runId = c.req.param("runId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, S.UNPROCESSABLE);
    }
    if (!isUuid(runId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid run id" } }, S.UNPROCESSABLE);
    }
    try {
      const run = await runService.getRun(u.id, projectId, runId);
      return c.json({ run }, S.OK);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/jobs/:jobId", requireAuth(authStore), async (c) => {
    const u = getAuthUser(c);
    const projectId = c.req.param("projectId");
    const jobId = c.req.param("jobId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, S.UNPROCESSABLE);
    }
    if (!isUuid(jobId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid job id" } }, S.UNPROCESSABLE);
    }
    try {
      const result = await runService.pollJob(u.id, projectId, jobId);
      return c.json(result, S.OK);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });
}