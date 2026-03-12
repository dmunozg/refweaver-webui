import { ProjectNotFoundError } from "../projects/service";
import type { RunRecord, ProjectLookup, RefweaverClient, RunStore } from "./types";

export class ProjectInactiveError extends Error {
  constructor() {
    super("project_inactive");
    this.name = "ProjectInactiveError";
  }
}

export class RunNotFoundError extends Error {
  constructor() {
    super("run_not_found");
    this.name = "RunNotFoundError";
  }
}

type RunServiceDeps = {
  store: RunStore;
  refweaver: RefweaverClient;
  projects: ProjectLookup;
};

async function assertActiveProject(projects: ProjectLookup, userId: string, projectId: string) {
  const project = await projects.getProject(userId, projectId);
  if (!project) {
    throw new ProjectNotFoundError();
  }
  if (project.deletedAt) {
    throw new ProjectInactiveError();
  }
}

export function createRunService(deps: RunServiceDeps) {
  return {
    async submitRun(userId: string, projectId: string, text: string): Promise<RunRecord> {
      await assertActiveProject(deps.projects, userId, projectId);

      const analyze = await deps.refweaver.analyze(userId, { text, includeMarkdown: true });
      return deps.store.createRun({
        projectId,
        userId,
        text,
        status: analyze.status,
        refweaverRunId: analyze.runId,
        refweaverJobId: analyze.jobId
      });
    },

    async listRuns(userId: string, projectId: string): Promise<RunRecord[]> {
      await assertActiveProject(deps.projects, userId, projectId);
      return deps.store.listRuns(userId, projectId);
    },

    async getRun(userId: string, projectId: string, runId: string): Promise<RunRecord> {
      await assertActiveProject(deps.projects, userId, projectId);
      const run = await deps.store.getRunById(userId, projectId, runId);
      if (!run) {
        throw new RunNotFoundError();
      }
      return run;
    },

    async pollJob(
      userId: string,
      projectId: string,
      jobId: string
    ): Promise<{ status: string; run: RunRecord | null }> {
      await assertActiveProject(deps.projects, userId, projectId);

      const local = await deps.store.getRunByJobId(userId, projectId, jobId);
      if (!local) {
        throw new RunNotFoundError();
      }

      const job = await deps.refweaver.getJob(userId, jobId);
      const updated = await deps.store.updateRunStatus(local.id, job.status, job.runId ?? local.refweaverRunId);
      return {
        status: job.status,
        run: updated
      };
    }
  };
}
