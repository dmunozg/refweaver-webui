import type { Hono } from "hono";
import type { BetterAuthApp } from "../auth/better-auth";
import { requireAuth } from "../middleware/require-auth";
import { toErrorResponse } from "../http/errors";
import { isUuid } from "../http/validation";
import type { createRunService } from "../runs/service";
import type { AuthVariables } from "../app";

type RunService = ReturnType<typeof createRunService>;

type AuthStore = BetterAuthApp;

function getAuthUser(c: import("hono").Context<{ Variables: AuthVariables }>): { id: string } {
  return c.get("authUser");
}

export function registerRunRoutes(app: Hono<{ Variables: AuthVariables }>, authStore: AuthStore, runService: RunService): void {
  app.post("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const u = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as const);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "validation_error", message: "Invalid JSON payload" } }, 422 as const);
    }

    const input = body as { text?: unknown };
    if (typeof input.text !== "string") {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, 422 as const);
    }

    const text = input.text.trim();
    if (!text) {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, 422 as const);
    }

    try {
      const run = await runService.submitRun(u.id, projectId, text);
      return c.json({ run }, 202 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as number);
    }
  });

  app.get("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const u = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as const);
    }
    try {
      const runs = await runService.listRuns(u.id, projectId);
      return c.json({ runs }, 200 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as number);
    }
  });

  app.get("/projects/:projectId/runs/:runId", requireAuth(authStore), async (c) => {
    const u = getAuthUser(c);
    const projectId = c.req.param("projectId");
    const runId = c.req.param("runId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as const);
    }
    if (!isUuid(runId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid run id" } }, 422 as const);
    }
    try {
      const run = await runService.getRun(u.id, projectId, runId);
      return c.json({ run }, 200 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as number);
    }
  });

  app.get("/projects/:projectId/jobs/:jobId", requireAuth(authStore), async (c) => {
    const u = getAuthUser(c);
    const projectId = c.req.param("projectId");
    const jobId = c.req.param("jobId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as const);
    }
    if (!isUuid(jobId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid job id" } }, 422 as const);
    }
    try {
      const result = await runService.pollJob(u.id, projectId, jobId);
      return c.json(result, 200 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as number);
    }
  });
}