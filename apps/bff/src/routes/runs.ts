import type { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { toErrorResponse } from "../http/errors";
import { isUuid } from "../http/validation";
import type { createRunService } from "../runs/service";

type RunService = ReturnType<typeof createRunService>;

type AuthStore = Parameters<typeof requireAuth>[0];

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
  app.post("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser" as never) as { id: string };
    const projectId = c.req.param("projectId" as never) as string;
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as any);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "validation_error", message: "Invalid JSON payload" } }, 422 as any);
    }

    const input = body as { text?: unknown; title?: unknown };
    if (typeof input.text !== "string") {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, 422 as any);
    }
    if (input.title !== undefined && typeof input.title !== "string") {
      return c.json({ error: { code: "validation_error", message: "Run title must be a string" } }, 422 as any);
    }

    const text = input.text.trim();
    if (!text) {
      return c.json({ error: { code: "validation_error", message: "Run text is required" } }, 422 as any);
    }

    try {
      const run = await runService.submitRun(authUser.id, projectId, text, input.title);
      return c.json({ run }, 202);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as any);
    }
  });

  app.get("/projects/:projectId/runs", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser" as never) as { id: string };
    const projectId = c.req.param("projectId" as never) as string;
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as any);
    }
    const page = parsePositiveInt(c.req.query("page" as never) as string | undefined, 1);
    if (page === null) {
      return c.json({ error: { code: "validation_error", message: "Invalid page" } }, 422 as any);
    }
    const pageSize = parsePositiveInt(c.req.query("page_size" as never) as string | undefined, 10);
    if (pageSize === null) {
      return c.json({ error: { code: "validation_error", message: "Invalid page size" } }, 422 as any);
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
        200 as any
      );
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as any);
    }
  });

  app.get("/projects/:projectId/runs/:runId", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser" as never) as { id: string };
    const projectId = c.req.param("projectId" as never) as string;
    const runId = c.req.param("runId" as never) as string;
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as any);
    }
    if (!isUuid(runId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid run id" } }, 422 as any);
    }
    try {
      const run = await runService.getRun(authUser.id, projectId, runId);
      return c.json({ run }, 200 as any);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as any);
    }
  });

  app.get("/projects/:projectId/jobs/:jobId", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser" as never) as { id: string };
    const projectId = c.req.param("projectId" as never) as string;
    const jobId = c.req.param("jobId" as never) as string;
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as any);
    }
    if (!isUuid(jobId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid job id" } }, 422 as any);
    }
    try {
      const result = await runService.pollJob(authUser.id, projectId, jobId);
      return c.json(result, 200 as any);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as any);
    }
  });
}
