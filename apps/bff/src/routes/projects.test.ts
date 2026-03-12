import { describe, expect, it } from "vitest";
import { createApp } from "../app";

function buildAuthStore() {
  return {
    async withTransaction<T>(fn: (txStore: any) => Promise<T>) {
      return fn(this);
    },
    async createUser() {
      return { id: "user-1" };
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
      return { id: "user-1", username: "ada", email: "ada@example.com", name: "Ada", teamId: null };
    },
    async findSessionByTokenHash() {
      return { id: "session-1", userId: "user-1", expiresAt: new Date(Date.now() + 60_000) };
    },
    async deleteSessionByTokenHash() {
      return;
    }
  };
}

describe("project routes", () => {
  it("creates and lists projects for authenticated user", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      projectService: {
        async createProject(_userId, name) {
          return {
            id: "project-2",
            name,
            ownerUserId: "user-1",
            teamId: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async listProjects() {
          return [
            {
              id: "project-1",
              name: "My First Project",
              ownerUserId: "user-1",
              teamId: null,
              deletedAt: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ];
        },
        async getProject() {
          throw new Error("unused");
        },
        async updateProjectName() {
          throw new Error("unused");
        },
        async softDeleteProject() {
          throw new Error("unused");
        },
        async restoreProject() {
          throw new Error("unused");
        }
      }
    });

    const createResponse = await app.request("/projects", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ name: "Research" })
    });
    expect(createResponse.status).toBe(201);

    const listResponse = await app.request("/projects", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(listResponse.status).toBe(200);
    const body = await listResponse.json();
    expect(body.projects).toHaveLength(1);
  });

  it("maps domain not-found errors into normalized envelope", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      projectService: {
        async createProject() {
          throw new Error("unused");
        },
        async listProjects() {
          return [];
        },
        async getProject() {
          const { ProjectNotFoundError } = await import("../projects/service");
          throw new ProjectNotFoundError();
        },
        async updateProjectName() {
          throw new Error("unused");
        },
        async softDeleteProject() {
          throw new Error("unused");
        },
        async restoreProject() {
          throw new Error("unused");
        }
      }
    });

    const response = await app.request("/projects/missing", {
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("project_not_found");
  });
});
