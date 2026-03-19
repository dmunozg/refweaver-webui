import type { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { toErrorResponse } from "../http/errors";
import { isUuid } from "../http/validation";
import type { createRunService } from "../runs/service";

type RunService = ReturnType<typeof createRunService>;

type AuthStore = Parameters<typeof requireAuth>[0];

export function registerRunRoutes(app: Hono, authStore: AuthStore, runService: RunService): void {
  app.post("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "validation_error", message: "Invalid JSON payload" } }, 422);
    }

    const input = body as { text?: unknown };
    if (typeof input.text !== "string") {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, 422);
    }

    const text = input.text.trim();
    if (!text) {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, 422);
    }

    try {
      const run = await runService.submitRun(authUser.id, projectId, text);
      return c.json({ run }, 202);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }
    try {
      const runs = await runService.listRuns(authUser.id, projectId);
      return c.json({ runs }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/runs/:runId", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    const projectId = c.req.param("projectId");
    const runId = c.req.param("runId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }
    if (!isUuid(runId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid run id" } }, 422);
    }
    try {
      const run = await runService.getRun(authUser.id, projectId, runId);
      return c.json({ run }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/jobs/:jobId", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    const projectId = c.req.param("projectId");
    const jobId = c.req.param("jobId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }
    if (!isUuid(jobId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid job id" } }, 422);
    }
    try {
      const result = await runService.pollJob(authUser.id, projectId, jobId);
      return c.json(result, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });
}
