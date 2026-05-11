import { describe, expect, it } from "vitest";
import {
  createRunService,
  ProjectInactiveError,
  RunNotFoundError,
  RunValidationError
} from "./service";
import type { RunStore, RefweaverClient, RunRecord, ProjectLookup } from "./types";
import { RefweaverHttpError } from "../refweaver/errors";

function makeRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "local-run-1",
    projectId: "project-1",
    userId: "user-1",
    title: null,
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
  it("passes status group filters through when listing runs", async () => {
    let receivedPagination: { limit: number; offset: number; statusGroup?: string } | null = null;

    const service = createRunService({
      store: {
        async createRun() {
          return makeRecord();
        },
        async listRuns(_userId, _projectId, pagination) {
          receivedPagination = pagination ?? null;
          return [makeRecord({ status: "finished" })];
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

    const runs = await service.listRuns("user-1", "project-1", {
      limit: 6,
      offset: 0,
      statusGroup: "terminal"
    });

    expect(receivedPagination).toEqual({ limit: 6, offset: 0, statusGroup: "terminal" });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("finished");
  });

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
    const submitted = await service.submitRun("user-1", "project-1", "  hello  ");

    expect(submitted.refweaverJobId).toBe("job-1");
    expect(created[0]?.projectId).toBe("project-1");
    expect(created[0]?.text).toBe("hello");
  });

  it("normalizes optional title before persisting a run", async () => {
    const created: Array<{ projectId: string; userId: string; text: string; title: string | null }> = [];

    const service = createRunService({
      store: {
        async createRun(input) {
          created.push(input);
          return makeRecord({ inputText: input.text, title: input.title });
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

    const submitted = await service.submitRun(
      "user-1",
      "project-1",
      "  hello  ",
      "  Draft analysis  "
    );

    expect(created[0]?.title).toBe("Draft analysis");
    expect(submitted.title).toBe("Draft analysis");
  });

  it("stores null when title is blank after trim", async () => {
    const created: Array<{ projectId: string; userId: string; text: string; title: string | null }> = [];

    const service = createRunService({
      store: {
        async createRun(input) {
          created.push(input);
          return makeRecord({ inputText: input.text, title: input.title });
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

    const submitted = await service.submitRun("user-1", "project-1", "hello", "   \n\t  ");

    expect(created[0]?.title).toBeNull();
    expect(submitted.title).toBeNull();
  });

  it("rejects titles longer than 120 characters", async () => {
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

    await expect(service.submitRun("user-1", "project-1", "hello", "x".repeat(121))).rejects.toBeInstanceOf(
      RunValidationError
    );
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

  it("rejects submitRun when text is blank after trim", async () => {
    let analyzeCalls = 0;
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
          analyzeCalls += 1;
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

    await expect(service.submitRun("user-1", "project-1", "   \n\t ")).rejects.toBeInstanceOf(
      RunValidationError
    );
    expect(analyzeCalls).toBe(0);
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
          return { status: "finished", jobId: "job-1", userId: "user-1", runId: "up-run-1" };
        },
        async getRun() {
          return { run: { id: "up-run-1" }, sentences: [], verdicts: {}, evaluations: [] };
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
    expect(result.run?.refweaverRunId).toBe("up-run-1");
  });

  it("includes the upstream run payload for finished runs with linked upstream ids", async () => {
    const service = createRunService({
      store: {
        async createRun() {
          return makeRecord();
        },
        async listRuns() {
          return [];
        },
        async getRunById() {
          return makeRecord({ status: "finished", refweaverRunId: "up-run-1" });
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
          return {
            run: { id: "up-run-1", status: "finished" },
            sentences: ["s1"],
            verdicts: { overall: "pass" },
            evaluations: ["e1"]
          };
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

    const result = (await service.getRun("user-1", "project-1", "local-run-1")) as any;

    expect(result.run.refweaverRunId).toBe("up-run-1");
    expect(result.upstreamRun).toEqual({
      run: { id: "up-run-1", status: "finished" },
      sentences: ["s1"],
      verdicts: { overall: "pass" },
      evaluations: ["e1"]
    });
  });

  it("falls back to the local run when upstream detail lookup returns 404", async () => {
    const service = createRunService({
      store: {
        async createRun() {
          return makeRecord();
        },
        async listRuns() {
          return [];
        },
        async getRunById() {
          return makeRecord({ status: "finished", refweaverRunId: "up-run-1" });
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
          throw new RefweaverHttpError(404, "not_found", "Missing", null);
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

    await expect(service.getRun("user-1", "project-1", "local-run-1")).resolves.toEqual({
      run: expect.objectContaining({
        id: "local-run-1",
        status: "finished",
        refweaverRunId: "up-run-1"
      })
    });
  });

  it("falls back to the local run when upstream detail lookup errors transiently", async () => {
    const service = createRunService({
      store: {
        async createRun() {
          return makeRecord();
        },
        async listRuns() {
          return [];
        },
        async getRunById() {
          return makeRecord({ status: "finished", refweaverRunId: "up-run-1" });
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
          throw new Error("temporary upstream failure");
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

    await expect(service.getRun("user-1", "project-1", "local-run-1")).resolves.toEqual({
      run: expect.objectContaining({
        id: "local-run-1",
        status: "finished",
        refweaverRunId: "up-run-1"
      })
    });
  });

  it("persists missing when upstream job is not found", async () => {
    let updatedArgs: { id: string; status: string; refweaverRunId: string | null | undefined } | null = null;

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
        async updateRunStatus(id, status, refweaverRunId) {
          updatedArgs = { id, status, refweaverRunId };
          return makeRecord({ status, refweaverRunId: refweaverRunId ?? null });
        }
      },
      refweaver: {
        async analyze() {
          return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
        },
        async getJob() {
          throw new RefweaverHttpError(404, "not_found", "Missing", null);
        },
        async getRun() {
          return { run: { id: "up-run-1" }, sentences: [], verdicts: {}, evaluations: [] };
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

    expect(result.status).toBe("missing");
    expect(result.run.status).toBe("missing");
    expect(updatedArgs).toEqual({ id: "local-run-1", status: "missing", refweaverRunId: "up-run-1" });
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

  it("throws when upstream poll user id mismatches requested user", async () => {
    let updated = false;
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
          return makeRecord({ refweaverRunId: "up-run-1", refweaverJobId: "job-1" });
        },
        async updateRunStatus() {
          updated = true;
          return makeRecord();
        }
      },
      refweaver: {
        async analyze() {
          return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
        },
        async getJob() {
          return { status: "finished", jobId: "job-1", userId: "user-2", runId: "up-run-1" };
        },
        async getRun() {
          return { run: { id: "up-run-1" }, sentences: [], verdicts: {}, evaluations: [] };
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
    expect(updated).toBe(false);
  });

  it("throws when upstream poll job id mismatches requested job", async () => {
    let updated = false;
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
          return makeRecord({ refweaverRunId: "up-run-1", refweaverJobId: "job-1" });
        },
        async updateRunStatus() {
          updated = true;
          return makeRecord();
        }
      },
      refweaver: {
        async analyze() {
          return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
        },
        async getJob() {
          return { status: "finished", jobId: "job-2", userId: "user-1", runId: "up-run-1" };
        },
        async getRun() {
          return { run: { id: "up-run-1" }, sentences: [], verdicts: {}, evaluations: [] };
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
    expect(updated).toBe(false);
  });

  it("throws when upstream poll run id mismatches local linkage", async () => {
    let updated = false;
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
          return makeRecord({ refweaverRunId: "up-run-1", refweaverJobId: "job-1" });
        },
        async updateRunStatus() {
          updated = true;
          return makeRecord();
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
    expect(updated).toBe(false);
  });

});
