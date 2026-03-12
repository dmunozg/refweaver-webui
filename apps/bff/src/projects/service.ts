import type { ProjectRecord, ProjectStore } from "./types";

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super("project_not_found");
    this.name = "ProjectNotFoundError";
  }
}

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    throw new ProjectValidationError("Project name is required");
  }
  return normalized;
}

export function createProjectService(store: ProjectStore) {
  return {
    async createProject(ownerUserId: string, name: string): Promise<ProjectRecord> {
      return store.createProject({ ownerUserId, name: normalizeName(name) });
    },

    async listProjects(ownerUserId: string, includeDeleted: boolean): Promise<ProjectRecord[]> {
      return store.listProjects(ownerUserId, includeDeleted);
    },

    async getProject(ownerUserId: string, projectId: string): Promise<ProjectRecord> {
      const project = await store.getProjectById(ownerUserId, projectId, true);
      if (!project) {
        throw new ProjectNotFoundError();
      }
      return project;
    },

    async updateProjectName(ownerUserId: string, projectId: string, name: string): Promise<ProjectRecord> {
      const project = await store.updateProjectName(ownerUserId, projectId, normalizeName(name));
      if (!project) {
        throw new ProjectNotFoundError();
      }
      return project;
    },

    async softDeleteProject(ownerUserId: string, projectId: string): Promise<ProjectRecord> {
      const project = await store.softDeleteProject(ownerUserId, projectId);
      if (!project) {
        throw new ProjectNotFoundError();
      }
      return project;
    },

    async restoreProject(ownerUserId: string, projectId: string): Promise<ProjectRecord> {
      const project = await store.restoreProject(ownerUserId, projectId);
      if (!project) {
        throw new ProjectNotFoundError();
      }
      return project;
    }
  };
}
