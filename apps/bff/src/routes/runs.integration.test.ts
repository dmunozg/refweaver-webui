import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createRunService } from "../runs/service";
import type { RunRecord, RunStore } from "../runs/types";

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

function createMemoryRunStore(): RunStore {
  const rows = new Map<string, RunRecord>();
  let seq = 1;

  return {
    async createRun(input) {
      const row: RunRecord = {
        id: `run-${seq++}`,
        projectId: input.projectId,
        userId: input.userId,
        inputText: input.text,
        status: input.status,
        refweaverRunId: input.refweaverRunId,
        refweaverJobId: input.refweaverJobId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      rows.set(row.id, row);
      return row;
    },
    async listRuns(userId, projectId) {
      return Array.from(rows.values()).filter((row) => row.userId === userId && row.projectId === projectId);
    },
    async getRunById(userId, projectId, runId) {
      const row = rows.get(runId) ?? null;
      if (!row || row.userId !== userId || row.projectId !== projectId) {
        return null;
      }
      return row;
    },
    async getRunByJobId(userId, projectId, jobId) {
      return (
        Array.from(rows.values()).find(
          (row) => row.userId === userId && row.projectId === projectId && row.refweaverJobId === jobId
        ) ?? null
      );
    },
    async updateRunStatus(id, status, refweaverRunId) {
      const row = rows.get(id) ?? null;
      if (!row) {
        return null;
      }
      row.status = status;
      if (refweaverRunId !== undefined) {
        row.refweaverRunId = refweaverRunId;
      }
      row.updatedAt = new Date();
      return row;
    }
  };
}

describe("run route integration", () => {
  it("submits run, lists history, and polls job lifecycle", async () => {
    const runService = createRunService({
      store: createMemoryRunStore(),
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

    const app = createApp({ signupStore: buildAuthStore(), runService });

    const submit = await app.request("/projects/project-1/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "Test sentence" })
    });
    expect(submit.status).toBe(202);

    const list = await app.request("/projects/project-1/runs", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.runs).toHaveLength(1);

    const poll = await app.request("/projects/project-1/jobs/job-1", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(poll.status).toBe(200);
    const pollBody = await poll.json();
    expect(pollBody.status).toBe("finished");
  });

  it("denies cross-user run access", async () => {
    const runService = createRunService({
      store: createMemoryRunStore(),
      refweaver: {
        async analyze() {
          return { runId: "up-run-9", status: "queued", jobId: "job-9", jobUrl: "/jobs/job-9" };
        },
        async getJob() {
          return { status: "started", jobId: "job-9", userId: "user-1" };
        },
        async getRun() {
          return { run: { id: "up-run-9" }, sentences: [], verdicts: {}, evaluations: [] };
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

    const ownerApp = createApp({ signupStore: buildAuthStore("user-1"), runService });
    const otherApp = createApp({ signupStore: buildAuthStore("user-2"), runService });

    const submit = await ownerApp.request("/projects/project-1/runs", {
      method: "POST",
      headers: { cookie: "rw_session=owner", "content-type": "application/json" },
      body: JSON.stringify({ text: "Owner text" })
    });
    expect(submit.status).toBe(202);

    const denied = await otherApp.request("/projects/project-1/jobs/job-9", {
      headers: { cookie: "rw_session=other" }
    });
    expect(denied.status).toBe(404);
    const deniedBody = await denied.json();
    expect(deniedBody.error.code).toBe("run_not_found");
  });

  it("rejects run submission for archived project", async () => {
    const runService = createRunService({
      store: createMemoryRunStore(),
      refweaver: {
        async analyze() {
          return { runId: "up-run-1", status: "queued", jobId: "job-1", jobUrl: "/jobs/job-1" };
        },
        async getJob() {
          return { status: "started", jobId: "job-1", userId: "user-1" };
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
            name: "Archived",
            teamId: null,
            deletedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }
    });

    const app = createApp({ signupStore: buildAuthStore("user-1"), runService });
    const response = await app.request("/projects/project-1/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "Test sentence" })
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("project_inactive");
  });
});
