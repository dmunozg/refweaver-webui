import { ProjectNotFoundError } from "../projects/service";
import { RefweaverHttpError } from "../refweaver/errors";
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

export class RunValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunValidationError";
  }
}

type RunServiceDeps = {
  store: RunStore;
  refweaver: RefweaverClient;
  projects: ProjectLookup;
};

function normalizeTitle(title?: string | null): string | null {
  if (title == null) {
    return null;
  }

  const normalized = title.trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > 120) {
    throw new RunValidationError("Run title must be 120 characters or fewer");
  }

  return normalized;
}

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
    async submitRun(
      userId: string,
      projectId: string,
      text: string,
      title?: string | null
    ): Promise<RunRecord> {
      await assertActiveProject(deps.projects, userId, projectId);

      const normalizedText = text.trim();
      if (!normalizedText) {
        throw new RunValidationError("Run text is required");
      }

      const normalizedTitle = normalizeTitle(title);

      const analyze = await deps.refweaver.analyze(userId, {
        text: normalizedText,
        includeMarkdown: true
      });
      return deps.store.createRun({
        projectId,
        userId,
        title: normalizedTitle,
        text: normalizedText,
        status: analyze.status,
        refweaverRunId: analyze.runId,
        refweaverJobId: analyze.jobId
      });
    },

    async listRuns(
      userId: string,
      projectId: string,
      pagination?: { limit: number; offset: number }
    ): Promise<RunRecord[]> {
      await assertActiveProject(deps.projects, userId, projectId);
      return deps.store.listRuns(userId, projectId, pagination);
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
    ): Promise<{ status: string; run: RunRecord }> {
      await assertActiveProject(deps.projects, userId, projectId);

      const local = await deps.store.getRunByJobId(userId, projectId, jobId);
      if (!local) {
        throw new RunNotFoundError();
      }

      let job;
      try {
        job = await deps.refweaver.getJob(userId, jobId);
      } catch (error) {
        if (error instanceof RefweaverHttpError && error.status === 404) {
          const updated = await deps.store.updateRunStatus(local.id, "missing", local.refweaverRunId);
          if (!updated) {
            throw new RunNotFoundError();
          }
          return {
            status: "missing",
            run: updated
          };
        }

        throw error;
      }
      if (job.userId !== userId) {
        throw new RunNotFoundError();
      }
      if (job.jobId !== jobId) {
        throw new RunNotFoundError();
      }
      if (job.runId && local.refweaverRunId && job.runId !== local.refweaverRunId) {
        throw new RunNotFoundError();
      }

      const updated = await deps.store.updateRunStatus(local.id, job.status, job.runId ?? local.refweaverRunId);
      if (!updated) {
        throw new RunNotFoundError();
      }
      return {
        status: job.status,
        run: updated
      };
    }
  };
}
