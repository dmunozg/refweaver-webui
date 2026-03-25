import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createRunService } from "../runs/service";
import type { AuthStore } from "../auth/store";
import type { RunRecord, RunStore } from "../runs/types";
import { RefweaverHttpError } from "../refweaver/errors";

function buildAuthStore(userId = "user-1"): AuthStore {
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
      return {
        id: userId,
        username: "ada",
        email: "ada@example.com",
        name: "Ada",
        passwordHash: "hash",
        teamId: null
      };
    },
    async findSessionByTokenHash() {
      return {
        id: "session-1",
        userId,
        sessionTokenHash: "hash",
        expiresAt: new Date(Date.now() + 60_000)
      };
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
      const timestamp = Date.now() + seq;
      const row: RunRecord = {
        id: `10000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`,
        projectId: input.projectId,
        userId: input.userId,
        title: input.title,
        inputText: input.text,
        status: input.status,
        refweaverRunId: input.refweaverRunId,
        refweaverJobId: input.refweaverJobId,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp)
      };
      rows.set(row.id, row);
      return row;
    },
    async listRuns(userId, projectId, pagination) {
      const sorted = Array.from(rows.values())
        .filter((row) => row.userId === userId && row.projectId === projectId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
      if (!pagination) {
        return sorted;
      }

      return sorted.slice(pagination.offset, pagination.offset + pagination.limit);
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
          return {
            runId: "20000000-0000-4000-8000-000000000001",
            status: "queued",
            jobId: "30000000-0000-4000-8000-000000000001",
            jobUrl: "/jobs/30000000-0000-4000-8000-000000000001"
          };
        },
        async getJob() {
          return {
            status: "finished",
            jobId: "30000000-0000-4000-8000-000000000001",
            userId: "user-1",
            runId: "20000000-0000-4000-8000-000000000001"
          };
        },
        async getRun() {
          return { run: { id: "up-run-1", title: null }, sentences: [], verdicts: {}, evaluations: [] };
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

    const submit = await app.request("/projects/40000000-0000-4000-8000-000000000001/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "Test sentence", title: "  Draft analysis  " })
    });
    expect(submit.status).toBe(202);
    const submitBody = await submit.json();
    expect(submitBody.run.title).toBe("Draft analysis");

    const list = await app.request("/projects/40000000-0000-4000-8000-000000000001/runs", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.runs).toHaveLength(1);
    expect(listBody.pagination).toEqual({ page: 1, pageSize: 10, hasNext: false, hasPrevious: false });

    const poll = await app.request(
      "/projects/40000000-0000-4000-8000-000000000001/jobs/30000000-0000-4000-8000-000000000001",
      {
        headers: { cookie: "rw_session=known-token" }
      }
    );
    expect(poll.status).toBe(200);
    const pollBody = await poll.json();
    expect(pollBody.status).toBe("finished");
  });

  it("marks a missing upstream job as missing in polls and history", async () => {
    const runService = createRunService({
      store: createMemoryRunStore(),
      refweaver: {
        async analyze() {
          return {
            runId: "20000000-0000-4000-8000-000000000002",
            status: "queued",
            jobId: "30000000-0000-4000-8000-000000000002",
            jobUrl: "/jobs/30000000-0000-4000-8000-000000000002"
          };
        },
        async getJob() {
          throw new RefweaverHttpError(404, "not_found", "Missing", null);
        },
        async getRun() {
          return { run: { id: "up-run-2", title: null }, sentences: [], verdicts: {}, evaluations: [] };
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

    await app.request("/projects/40000000-0000-4000-8000-000000000002/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "Test sentence" })
    });

    const poll = await app.request(
      "/projects/40000000-0000-4000-8000-000000000002/jobs/30000000-0000-4000-8000-000000000002",
      {
        headers: { cookie: "rw_session=known-token" }
      }
    );
    expect(poll.status).toBe(200);
    expect((await poll.json()).status).toBe("missing");

    const list = await app.request("/projects/40000000-0000-4000-8000-000000000002/runs", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.runs[0].status).toBe("missing");
  });

  it("lists newest runs first", async () => {
    const runService = createRunService({
      store: createMemoryRunStore(),
      refweaver: {
        async analyze() {
          return {
            runId: "20000000-0000-4000-8000-000000000001",
            status: "queued",
            jobId: "30000000-0000-4000-8000-000000000001",
            jobUrl: "/jobs/30000000-0000-4000-8000-000000000001"
          };
        },
        async getJob() {
          return {
            status: "finished",
            jobId: "30000000-0000-4000-8000-000000000001",
            userId: "user-1",
            runId: "20000000-0000-4000-8000-000000000001"
          };
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

    await app.request("/projects/40000000-0000-4000-8000-000000000001/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "First", title: "Older" })
    });
    await app.request("/projects/40000000-0000-4000-8000-000000000001/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "Second", title: "Newest" })
    });

    const list = await app.request("/projects/40000000-0000-4000-8000-000000000001/runs", {
      headers: { cookie: "rw_session=known-token" }
    });
    const body = await list.json();

    expect(body.runs.map((run: { title: string | null }) => run.title)).toEqual(["Newest", "Older"]);
  });

  it("denies cross-user run access", async () => {
    const runService = createRunService({
      store: createMemoryRunStore(),
      refweaver: {
        async analyze() {
          return {
            runId: "20000000-0000-4000-8000-000000000009",
            status: "queued",
            jobId: "30000000-0000-4000-8000-000000000009",
            jobUrl: "/jobs/30000000-0000-4000-8000-000000000009"
          };
        },
        async getJob() {
          return { status: "started", jobId: "30000000-0000-4000-8000-000000000009", userId: "user-1" };
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

    const submit = await ownerApp.request("/projects/40000000-0000-4000-8000-000000000009/runs", {
      method: "POST",
      headers: { cookie: "rw_session=owner", "content-type": "application/json" },
      body: JSON.stringify({ text: "Owner text" })
    });
    expect(submit.status).toBe(202);

    const denied = await otherApp.request(
      "/projects/40000000-0000-4000-8000-000000000009/jobs/30000000-0000-4000-8000-000000000009",
      {
        headers: { cookie: "rw_session=other" }
      }
    );
    expect(denied.status).toBe(404);
    const deniedBody = await denied.json();
    expect(deniedBody.error.code).toBe("run_not_found");
  });

  it("rejects run submission for archived project", async () => {
    const runService = createRunService({
      store: createMemoryRunStore(),
      refweaver: {
        async analyze() {
          return {
            runId: "20000000-0000-4000-8000-000000000001",
            status: "queued",
            jobId: "30000000-0000-4000-8000-000000000001",
            jobUrl: "/jobs/30000000-0000-4000-8000-000000000001"
          };
        },
        async getJob() {
          return { status: "started", jobId: "30000000-0000-4000-8000-000000000001", userId: "user-1" };
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
    const response = await app.request("/projects/40000000-0000-4000-8000-000000000001/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "Test sentence" })
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("project_inactive");
  });
});
