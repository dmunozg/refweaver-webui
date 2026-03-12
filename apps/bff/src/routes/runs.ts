import type { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { toErrorResponse } from "../http/errors";

type RunService = {
  submitRun(userId: string, projectId: string, text: string): Promise<unknown>;
  listRuns(userId: string, projectId: string): Promise<unknown[]>;
  getRun(userId: string, projectId: string, runId: string): Promise<unknown>;
  pollJob(userId: string, projectId: string, jobId: string): Promise<{ status: string; run: unknown }>;
};

type AuthStore = Parameters<typeof requireAuth>[0];

export function registerRunRoutes(app: Hono, authStore: AuthStore, runService: RunService): void {
  app.post("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
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

    try {
      const run = await runService.submitRun(authUser.id, c.req.param("projectId"), input.text);
      return c.json({ run }, 202);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    try {
      const runs = await runService.listRuns(authUser.id, c.req.param("projectId"));
      return c.json({ runs }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/runs/:runId", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    try {
      const run = await runService.getRun(authUser.id, c.req.param("projectId"), c.req.param("runId"));
      return c.json({ run }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/jobs/:jobId", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    try {
      const result = await runService.pollJob(authUser.id, c.req.param("projectId"), c.req.param("jobId"));
      return c.json(result, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });
}
