import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createProjectService } from "../projects/service";
import type { ProjectRecord, ProjectStore } from "../projects/types";

function buildAuthStore(userId = "user-1") {
  return {
    async withTransaction<T>(fn: (txStore: any) => Promise<T>) {
      return fn(this);
    },
    async createUser() {
      return { id: userId };
    },
    async createProject() {
      return { id: "project-1" };
    },
    async createSession() {
      return { id: "session-1" };
    },
    async findUserByIdentifier() {
      return null;
    },
    async findUserById() {
      return { id: userId, username: "ada", email: "ada@example.com", name: "Ada", teamId: null };
    },
    async findSessionByTokenHash() {
      return { id: "session-1", userId, expiresAt: new Date(Date.now() + 60_000) };
    },
    async deleteSessionByTokenHash() {
      return;
    }
  };
}

function createMemoryProjectStore(): ProjectStore {
  const rows = new Map<string, ProjectRecord>();
  let seq = 1;

  return {
    async createProject(input) {
      const row: ProjectRecord = {
        id: `00000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`,
        ownerUserId: input.ownerUserId,
        name: input.name,
        teamId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      rows.set(row.id, row);
      return row;
    },
    async listProjects(ownerUserId, includeDeleted) {
      return Array.from(rows.values()).filter(
        (row) => row.ownerUserId === ownerUserId && (includeDeleted || row.deletedAt === null)
      );
    },
    async getProjectById(ownerUserId, projectId, includeDeleted) {
      const row = rows.get(projectId) ?? null;
      if (!row || row.ownerUserId !== ownerUserId) {
        return null;
      }
      if (!includeDeleted && row.deletedAt !== null) {
        return null;
      }
      return row;
    },
    async updateProjectName(ownerUserId, projectId, name) {
      const row = rows.get(projectId);
      if (!row || row.ownerUserId !== ownerUserId) {
        return null;
      }
      row.name = name;
      row.updatedAt = new Date();
      return row;
    },
    async softDeleteProject(ownerUserId, projectId) {
      const row = rows.get(projectId);
      if (!row || row.ownerUserId !== ownerUserId) {
        return null;
      }
      row.deletedAt = new Date();
      return row;
    },
    async restoreProject(ownerUserId, projectId) {
      const row = rows.get(projectId);
      if (!row || row.ownerUserId !== ownerUserId) {
        return null;
      }
      row.deletedAt = null;
      return row;
    }
  };
}

describe("project route integration", () => {
  it("creates, archives, lists with include_deleted, and restores project", async () => {
    const projectService = createProjectService(createMemoryProjectStore());
    const app = createApp({ signupStore: buildAuthStore(), projectService });

    const createResponse = await app.request("/projects", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ name: " Research A " })
    });
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    const projectId = created.project.id as string;

    const deleteResponse = await app.request(`/projects/${projectId}`, {
      method: "DELETE",
      headers: { cookie: "rw_session=known-token" }
    });
    expect(deleteResponse.status).toBe(200);

    const activeList = await app.request("/projects", {
      headers: { cookie: "rw_session=known-token" }
    });
    const activeBody = await activeList.json();
    expect(activeBody.projects).toHaveLength(0);

    const allList = await app.request("/projects?include_deleted=true", {
      headers: { cookie: "rw_session=known-token" }
    });
    const allBody = await allList.json();
    expect(allBody.projects).toHaveLength(1);

    const restoreResponse = await app.request(`/projects/${projectId}/restore`, {
      method: "POST",
      headers: { cookie: "rw_session=known-token" }
    });
    expect(restoreResponse.status).toBe(200);
  });

  it("denies cross-user project access", async () => {
    const projectService = createProjectService(createMemoryProjectStore());
    const ownerApp = createApp({ signupStore: buildAuthStore("user-1"), projectService });
    const otherUserApp = createApp({ signupStore: buildAuthStore("user-2"), projectService });

    const created = await ownerApp.request("/projects", {
      method: "POST",
      headers: { cookie: "rw_session=owner", "content-type": "application/json" },
      body: JSON.stringify({ name: "Owner Project" })
    });
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    const projectId = createdBody.project.id as string;

    const otherGet = await otherUserApp.request(`/projects/${projectId}`, {
      headers: { cookie: "rw_session=other" }
    });
    expect(otherGet.status).toBe(404);
    const errorBody = await otherGet.json();
    expect(errorBody.error.code).toBe("project_not_found");
  });
});
