import { describe, expect, it } from "vitest";
import {
  createProjectService,
  ProjectNotFoundError,
  ProjectValidationError
} from "./service";
import type { ProjectStore } from "./types";

function createFakeStore(): ProjectStore {
  const records = new Map<string, any>([
    [
      "project-1",
      {
        id: "project-1",
        ownerUserId: "user-1",
        name: "Project One",
        teamId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  ]);

  return {
    async createProject(input) {
      const project = {
        id: "project-new",
        ownerUserId: input.ownerUserId,
        name: input.name,
        teamId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      records.set(project.id, project);
      return project;
    },
    async listProjects(ownerUserId, includeDeleted) {
      return Array.from(records.values()).filter(
        (project) =>
          project.ownerUserId === ownerUserId && (includeDeleted || project.deletedAt === null)
      );
    },
    async getProjectById(ownerUserId, projectId, includeDeleted) {
      const project = records.get(projectId) ?? null;
      if (!project || project.ownerUserId !== ownerUserId) {
        return null;
      }
      if (!includeDeleted && project.deletedAt !== null) {
        return null;
      }
      return project;
    },
    async updateProjectName(ownerUserId, projectId, name) {
      const project = records.get(projectId);
      if (!project || project.ownerUserId !== ownerUserId) {
        return null;
      }
      project.name = name;
      project.updatedAt = new Date();
      return project;
    },
    async softDeleteProject(ownerUserId, projectId) {
      const project = records.get(projectId);
      if (!project || project.ownerUserId !== ownerUserId) {
        return null;
      }
      project.deletedAt = new Date();
      return project;
    },
    async restoreProject(ownerUserId, projectId) {
      const project = records.get(projectId);
      if (!project || project.ownerUserId !== ownerUserId) {
        return null;
      }
      project.deletedAt = null;
      return project;
    }
  };
}

describe("project service", () => {
  it("creates project with normalized name", async () => {
    const service = createProjectService(createFakeStore());
    const created = await service.createProject("user-1", "  New Project  ");
    expect(created.name).toBe("New Project");
  });

  it("throws on empty project name", async () => {
    const service = createProjectService(createFakeStore());
    await expect(service.createProject("user-1", "   ")).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it("lists projects with includeDeleted flag", async () => {
    const service = createProjectService(createFakeStore());
    await service.softDeleteProject("user-1", "project-1");

    const active = await service.listProjects("user-1", false);
    const all = await service.listProjects("user-1", true);

    expect(active).toHaveLength(0);
    expect(all).toHaveLength(1);
  });

  it("throws not found for unknown project", async () => {
    const service = createProjectService(createFakeStore());
    await expect(service.getProject("user-1", "missing")).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
