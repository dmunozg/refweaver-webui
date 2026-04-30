import type { Hono } from "hono";
import type { BetterAuthApp } from "../auth/better-auth";
import { requireAuth } from "../middleware/require-auth";
import { toErrorResponse } from "../http/errors";
import { isUuid } from "../http/validation";
import type { createProjectService } from "../projects/service";
import type { AuthVariables } from "../app";

type ProjectService = ReturnType<typeof createProjectService>;

type AuthStore = BetterAuthApp;

function getAuthUser(c: import("hono").Context<{ Variables: AuthVariables }>): { id: string } {
  return c.get("authUser");
}

export function registerProjectRoutes(app: Hono<{ Variables: AuthVariables }>, authStore: AuthStore, projectService: ProjectService): void {
  app.post("/projects", requireAuth(authStore), async (c) => {
    const user = getAuthUser(c);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "validation_error", message: "Invalid JSON payload" } }, 422 as const);
    }

    const input = body as { name?: unknown };
    if (typeof input.name !== "string") {
      return c.json({ error: { code: "validation_error", message: "Project name is required" } }, 422 as const);
    }

    try {
      const project = await projectService.createProject(user.id, input.name);
      return c.json({ project }, 201 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects", requireAuth(authStore), async (c) => {
    const user = getAuthUser(c);
    const includeDeleted = c.req.query("include_deleted") === "true";

    try {
      const projects = await projectService.listProjects(user.id, includeDeleted);
      return c.json({ projects }, 200 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as const);
    }
  });

  app.get("/projects/:projectId", requireAuth(authStore), async (c) => {
    const user = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as const);
    }
    try {
      const project = await projectService.getProject(user.id, projectId);
      return c.json({ project }, 200 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as const);
    }
  });

  app.patch("/projects/:projectId", requireAuth(authStore), async (c) => {
    const user = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as const);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "validation_error", message: "Invalid JSON payload" } }, 422);
    }
    const input = body as { name?: unknown };
    if (typeof input.name !== "string") {
      return c.json({ error: { code: "validation_error", message: "Project name is required" } }, 422);
    }

    try {
      const project = await projectService.updateProjectName(
        user.id,
        projectId,
        input.name
      );
      return c.json({ project }, 200 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as const);
    }
  });

  app.delete("/projects/:projectId", requireAuth(authStore), async (c) => {
    const user = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422 as const);
    }
    try {
      const project = await projectService.softDeleteProject(user.id, projectId);
      return c.json({ project }, 200 as const);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status as const);
    }
  });

  app.post("/projects/:projectId/restore", requireAuth(authStore), async (c) => {
    const user = getAuthUser(c);
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }
    try {
      const project = await projectService.restoreProject(user.id, projectId);
      return c.json({ project }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });
}
