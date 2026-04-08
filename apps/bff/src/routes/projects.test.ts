import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { BetterAuthApp } from "../auth/better-auth";
import type { createProjectService } from "../projects/service";

function buildAuth(userId = "user-1"): BetterAuthApp {
  return {
    async handler() {
      return new Response(null, { status: 204 });
    },
    api: {
      async getSession() {
        return {
          user: { id: userId, username: "ada", email: "ada@example.com", name: "Ada", adminRole: "user", projectId: null }
        };
      }
    }
  };
}

function buildProjectService() {
  return {
    async createProject(userId: string, name: string) {
      return { id: "project-1", ownerUserId: userId, name, teamId: null };
    },
    async listProjects() {
      return [];
    },
    async getProject() {
      return { id: "project-1", ownerUserId: "user-1", name: "Project", teamId: null, deletedAt: null };
    },
    async updateProjectName() {
      return { id: "project-1", ownerUserId: "user-1", name: "Updated", teamId: null, deletedAt: null };
    },
    async softDeleteProject() {
      return { id: "project-1", ownerUserId: "user-1", name: "Project", teamId: null, deletedAt: new Date() };
    },
    async restoreProject() {
      return { id: "project-1", ownerUserId: "user-1", name: "Project", teamId: null, deletedAt: null };
    }
  } as unknown as ReturnType<typeof createProjectService>;
}

function buildAuthNoSession(): BetterAuthApp {
  return {
    async handler() {
      return new Response(null, { status: 204 });
    },
    api: {
      async getSession() {
        return null;
      }
    }
  };
}

describe("project routes", () => {
  it("creates and lists projects for authenticated user", async () => {
    const app = createApp({ auth: buildAuth(), projectService: buildProjectService() });

    const response = await app.request("/projects", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "rw_session=known-token" },
      body: JSON.stringify({ name: "Project" })
    });

    expect(response.status).toBe(201);
  });

  it("returns validation error for malformed project id", async () => {
    const app = createApp({ auth: buildAuth(), projectService: buildProjectService() });
    const response = await app.request("/projects/not-a-uuid", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(response.status).toBe(422);
  });

  it("denies GET /projects without session", async () => {
    const app = createApp({ auth: buildAuthNoSession(), projectService: buildProjectService() });
    const response = await app.request("/projects", {
      headers: { cookie: "rw_session=unknown-token" }
    });
    expect(response.status).toBe(401);
  });

  it("rejects POST /projects with missing name", async () => {
    const app = createApp({ auth: buildAuth(), projectService: buildProjectService() });
    const response = await app.request("/projects", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "rw_session=known-token" },
      body: JSON.stringify({})
    });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
  });

  it("rejects POST /projects with non-string name", async () => {
    const app = createApp({ auth: buildAuth(), projectService: buildProjectService() });
    const response = await app.request("/projects", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "rw_session=known-token" },
      body: JSON.stringify({ name: 123 })
    });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
  });
});
