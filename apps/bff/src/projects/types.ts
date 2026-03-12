export type ProjectRecord = {
  id: string;
  name: string;
  ownerUserId: string;
  teamId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProjectInput = {
  ownerUserId: string;
  name: string;
};

export type ProjectStore = {
  createProject(input: CreateProjectInput): Promise<ProjectRecord>;
  listProjects(ownerUserId: string, includeDeleted: boolean): Promise<ProjectRecord[]>;
  getProjectById(
    ownerUserId: string,
    projectId: string,
    includeDeleted: boolean
  ): Promise<ProjectRecord | null>;
  updateProjectName(
    ownerUserId: string,
    projectId: string,
    name: string
  ): Promise<ProjectRecord | null>;
  softDeleteProject(ownerUserId: string, projectId: string): Promise<ProjectRecord | null>;
  restoreProject(ownerUserId: string, projectId: string): Promise<ProjectRecord | null>;
};
