import type { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { toErrorResponse } from "../http/errors";
import { isUuid } from "../http/validation";
import type { createProjectService } from "../projects/service";

type ProjectService = ReturnType<typeof createProjectService>;

type AuthStore = Parameters<typeof requireAuth>[0];

export function registerProjectRoutes(app: Hono, authStore: AuthStore, projectService: ProjectService): void {
  app.post("/projects", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
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
      const project = await projectService.createProject(authUser.id, input.name);
      return c.json({ project }, 201);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    const includeDeleted = c.req.query("include_deleted") === "true";

    try {
      const projects = await projectService.listProjects(authUser.id, includeDeleted);
      return c.json({ projects }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.get("/projects/:projectId", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }
    try {
      const project = await projectService.getProject(authUser.id, projectId);
      return c.json({ project }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.patch("/projects/:projectId", requireAuth(authStore), async (c) => {
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
    const input = body as { name?: unknown };
    if (typeof input.name !== "string") {
      return c.json({ error: { code: "validation_error", message: "Project name is required" } }, 422);
    }

    try {
      const project = await projectService.updateProjectName(
        authUser.id,
        projectId,
        input.name
      );
      return c.json({ project }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.delete("/projects/:projectId", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }
    try {
      const project = await projectService.softDeleteProject(authUser.id, projectId);
      return c.json({ project }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.post("/projects/:projectId/restore", requireAuth(authStore), async (c) => {
    const authUser = c.get("authUser") as { id: string };
    const projectId = c.req.param("projectId");
    if (!isUuid(projectId)) {
      return c.json({ error: { code: "validation_error", message: "Invalid project id" } }, 422);
    }
    try {
      const project = await projectService.restoreProject(authUser.id, projectId);
      return c.json({ project }, 200);
    } catch (error) {
      const mapped = toErrorResponse(error);
      return c.json(mapped.body, mapped.status);
    }
  });
}
