import { describe, expect, it } from "vitest";
import { createRunService, ProjectInactiveError, RunNotFoundError } from "./service";
import type { RunStore, RefweaverClient, RunRecord, ProjectLookup } from "./types";

function makeRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "local-run-1",
    projectId: "project-1",
    userId: "user-1",
    inputText: "input",
    status: "queued",
    refweaverRunId: "up-run-1",
    refweaverJobId: "job-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

describe("run service", () => {
  it("submits analyze request and persists lifecycle ids", async () => {
    const created: Array<{ projectId: string; userId: string; text: string }> = [];

    const store: RunStore = {
      async createRun(input) {
        created.push(input);
        return makeRecord({ inputText: input.text });
      },
      async listRuns() {
        return [makeRecord()];
      },
      async getRunById() {
        return makeRecord();
      },
      async getRunByJobId() {
        return makeRecord();
      },
      async updateRunStatus(_id, _status, refweaverRunId) {
        return makeRecord({ status: "started", refweaverRunId });
      }
    };

    const refweaver: RefweaverClient = {
      async analyze() {
        return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
      },
      async getJob() {
        return { status: "finished", jobId: "job-1", userId: "user-1", runId: "up-run-1" };
      },
      async getRun() {
        return { run: { id: "up-run-1" }, sentences: [], verdicts: {}, evaluations: [] };
      }
    };

    const projects: ProjectLookup = {
      async getProject(ownerUserId, projectId) {
        return {
          id: projectId,
          ownerUserId,
          name: "Project",
          teamId: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    };

    const service = createRunService({ store, refweaver, projects });
    const submitted = await service.submitRun("user-1", "project-1", "hello");

    expect(submitted.refweaverJobId).toBe("job-1");
    expect(created[0]?.projectId).toBe("project-1");
  });

  it("rejects submissions for soft-deleted projects", async () => {
    const service = createRunService({
      store: {
        async createRun() {
          return makeRecord();
        },
        async listRuns() {
          return [];
        },
        async getRunById() {
          return null;
        },
        async getRunByJobId() {
          return null;
        },
        async updateRunStatus() {
          return null;
        }
      },
      refweaver: {
        async analyze() {
          return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
        },
        async getJob() {
          return { status: "started", jobId: "job-1", userId: "user-1" };
        },
        async getRun() {
          return { run: {}, sentences: [], verdicts: {}, evaluations: [] };
        }
      },
      projects: {
        async getProject(ownerUserId, projectId) {
          return {
            id: projectId,
            ownerUserId,
            name: "Project",
            teamId: null,
            deletedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }
    });

    await expect(service.submitRun("user-1", "project-1", "hello")).rejects.toBeInstanceOf(
      ProjectInactiveError
    );
  });

  it("polls job status and updates local lifecycle", async () => {
    const service = createRunService({
      store: {
        async createRun() {
          return makeRecord();
        },
        async listRuns() {
          return [makeRecord()];
        },
        async getRunById() {
          return makeRecord();
        },
        async getRunByJobId() {
          return makeRecord({ refweaverJobId: "job-1" });
        },
        async updateRunStatus(_id, status, refweaverRunId) {
          return makeRecord({ status, refweaverRunId });
        }
      },
      refweaver: {
        async analyze() {
          return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
        },
        async getJob() {
          return { status: "finished", jobId: "job-1", userId: "user-1", runId: "up-run-2" };
        },
        async getRun() {
          return { run: { id: "up-run-2" }, sentences: [], verdicts: {}, evaluations: [] };
        }
      },
      projects: {
        async getProject(ownerUserId, projectId) {
          return {
            id: projectId,
            ownerUserId,
            name: "Project",
            teamId: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }
    });

    const result = await service.pollJob("user-1", "project-1", "job-1");
    expect(result.status).toBe("finished");
    expect(result.run?.refweaverRunId).toBe("up-run-2");
  });

  it("throws for missing run in project", async () => {
    const service = createRunService({
      store: {
        async createRun() {
          return makeRecord();
        },
        async listRuns() {
          return [];
        },
        async getRunById() {
          return null;
        },
        async getRunByJobId() {
          return null;
        },
        async updateRunStatus() {
          return null;
        }
      },
      refweaver: {
        async analyze() {
          return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
        },
        async getJob() {
          return { status: "started", jobId: "job-1", userId: "user-1" };
        },
        async getRun() {
          return { run: {}, sentences: [], verdicts: {}, evaluations: [] };
        }
      },
      projects: {
        async getProject(ownerUserId, projectId) {
          return {
            id: projectId,
            ownerUserId,
            name: "Project",
            teamId: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }
    });

    await expect(service.getRun("user-1", "project-1", "run-missing")).rejects.toBeInstanceOf(
      RunNotFoundError
    );
  });

  it("throws when poll update cannot persist local run", async () => {
    const service = createRunService({
      store: {
        async createRun() {
          return makeRecord();
        },
        async listRuns() {
          return [];
        },
        async getRunById() {
          return makeRecord();
        },
        async getRunByJobId() {
          return makeRecord({ refweaverJobId: "job-1" });
        },
        async updateRunStatus() {
          return null;
        }
      },
      refweaver: {
        async analyze() {
          return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
        },
        async getJob() {
          return { status: "finished", jobId: "job-1", userId: "user-1", runId: "up-run-2" };
        },
        async getRun() {
          return { run: { id: "up-run-2" }, sentences: [], verdicts: {}, evaluations: [] };
        }
      },
      projects: {
        async getProject(ownerUserId, projectId) {
          return {
            id: projectId,
            ownerUserId,
            name: "Project",
            teamId: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }
    });

    await expect(service.pollJob("user-1", "project-1", "job-1")).rejects.toBeInstanceOf(
      RunNotFoundError
    );
  });
});
