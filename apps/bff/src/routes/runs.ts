import type { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { toErrorResponse } from "../http/errors";
import { isUuid } from "../http/validation";
import type { createRunService } from "../runs/service";

type RunService = ReturnType<typeof createRunService>;
type AuthStore = Parameters<typeof requireAuth>[0];

type RunRouteContext = {
  get(name: "authUser"): unknown;
  req: {
    param(name: "projectId" | "runId" | "jobId"): string;
    query(name: "page" | "page_size"): string | undefined;
    json(): Promise<unknown>;
  };
  json(body: unknown, status?: number): Response;
};

function getAuthUser(c: RunRouteContext): { id: string } {
  return c.get("authUser") as { id: string };
}

function parsePositiveInt(value: string | undefined, fallback: number): number | null {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export function registerRunRoutes(app: Hono, authStore: AuthStore, runService: RunService): void {
  app.post("/projects/:projectId/runs", requireAuth(authStore), async (c: RunRouteContext) => {
    const authUser = getAuthUser(c);
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

    const input = body as { text?: unknown; title?: unknown };
    if (typeof input.text !== "string") {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, 422);
    }
    if (input.title !== undefined && typeof input.title !== "string") {
      return c.json({ error: { code: "validation_error", message: "Run title must be a string" } }, 422);
    }

    const text = input.text.trim();
    if (!text) {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, 422);
    }

    try {
      const run = await runService.submitRun(authUser.id, projectId, text, input.title);
      return c.json({ run }, 202);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/runs", requireAuth(authStore), async (c: RunRouteContext) => {
    const authUser = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }

    const page = parsePositiveInt(c.req.query("page"), 1);
    if (page === null) {
      return c.json({ error: { code: "validation_error", message: "Invalid page" } }, 422);
    }

    const pageSize = parsePositiveInt(c.req.query("page_size"), 10);
    if (pageSize === null) {
      return c.json({ error: { code: "validation_error", message: "Invalid page size" } }, 422);
    }

    try {
      const requestedLimit = pageSize + 1;
      const runs = await runService.listRuns(authUser.id, projectId, {
        limit: requestedLimit,
        offset: (page - 1) * pageSize
      });
      const hasNext = runs.length > pageSize;
      return c.json(
        {
          runs: hasNext ? runs.slice(0, pageSize) : runs,
          pagination: {
            page,
            pageSize,
            hasNext,
            hasPrevious: page > 1
          }
        },
        200
      );
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/runs/:runId", requireAuth(authStore), async (c: RunRouteContext) => {
    const authUser = getAuthUser(c);
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
      return c.json(run, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId/jobs/:jobId", requireAuth(authStore), async (c: RunRouteContext) => {
    const authUser = getAuthUser(c);
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
