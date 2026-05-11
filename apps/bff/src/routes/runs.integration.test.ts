import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createRunService } from "../runs/service";
import type { BetterAuthApp } from "../auth/better-auth";
import { TERMINAL_RUN_STATUSES, type RunRecord, type RunStore } from "../runs/types";
import { RefweaverHttpError } from "../refweaver/errors";

function buildAuthStore(userId = "user-1"): BetterAuthApp {
  return {
    async handler() {
      return new Response(null, { status: 204 });
    },
    api: {
      async getSession({ headers }) {
        if (!headers.get("cookie")) {
          return null;
        }

        return {
          user: {
            id: userId,
            username: "ada",
            email: "ada@example.com",
            name: "Ada",
            adminRole: "user",
            projectId: null
          }
        };
      }
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
      const filtered =
        pagination?.statusGroup === "terminal"
          ? sorted.filter((row) => TERMINAL_RUN_STATUSES.includes(row.status as (typeof TERMINAL_RUN_STATUSES)[number]))
          : pagination?.statusGroup === "in_progress"
            ? sorted.filter((row) => !TERMINAL_RUN_STATUSES.includes(row.status as (typeof TERMINAL_RUN_STATUSES)[number]))
            : sorted;
      if (!pagination) {
        return filtered;
      }

      return filtered.slice(pagination.offset, pagination.offset + pagination.limit);
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

function createSeededRunStore(seed: RunRecord[]): RunStore {
  const rows = [...seed];

  return {
    async createRun() {
      throw new Error("not used");
    },
    async listRuns(userId, projectId, pagination) {
      const sorted = rows
        .filter((row) => row.userId === userId && row.projectId === projectId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
      const filtered =
        pagination?.statusGroup === "terminal"
          ? sorted.filter((row) => TERMINAL_RUN_STATUSES.includes(row.status as (typeof TERMINAL_RUN_STATUSES)[number]))
          : pagination?.statusGroup === "in_progress"
            ? sorted.filter((row) => !TERMINAL_RUN_STATUSES.includes(row.status as (typeof TERMINAL_RUN_STATUSES)[number]))
            : sorted;
      if (!pagination) {
        return filtered;
      }

      return filtered.slice(pagination.offset, pagination.offset + pagination.limit);
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

    const app = createApp({ auth: buildAuthStore(), runService });

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

    const detail = await app.request(
      "/projects/40000000-0000-4000-8000-000000000001/runs/10000000-0000-4000-8000-000000000001",
      {
        headers: { cookie: "rw_session=known-token" }
      }
    );
    expect(detail.status).toBe(200);
    const detailBody = await detail.json();
    expect(detailBody.run.status).toBe("finished");
    expect(detailBody.upstreamRun).toEqual({
      run: { id: "up-run-1", title: null },
      sentences: [],
      verdicts: {},
      evaluations: []
    });
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

    const app = createApp({ auth: buildAuthStore(), runService });

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

    const app = createApp({ auth: buildAuthStore(), runService });

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

  it("returns the newest terminal runs when filtering the list", async () => {
    const seededRows: RunRecord[] = [
      {
        id: "run-1",
        projectId: "40000000-0000-4000-8000-000000000001",
        userId: "user-1",
        title: "Newest in progress",
        inputText: "n1",
        status: "started",
        refweaverRunId: null,
        refweaverJobId: "job-1",
        createdAt: new Date("2025-03-10T10:00:00.000Z"),
        updatedAt: new Date("2025-03-10T10:00:00.000Z")
      },
      {
        id: "run-2",
        projectId: "40000000-0000-4000-8000-000000000001",
        userId: "user-1",
        title: "Newest terminal",
        inputText: "t1",
        status: "finished",
        refweaverRunId: null,
        refweaverJobId: "job-2",
        createdAt: new Date("2025-03-09T10:00:00.000Z"),
        updatedAt: new Date("2025-03-09T10:00:00.000Z")
      },
      {
        id: "run-3",
        projectId: "40000000-0000-4000-8000-000000000001",
        userId: "user-1",
        title: "Middle in progress",
        inputText: "n2",
        status: "started",
        refweaverRunId: null,
        refweaverJobId: "job-3",
        createdAt: new Date("2025-03-08T10:00:00.000Z"),
        updatedAt: new Date("2025-03-08T10:00:00.000Z")
      },
      {
        id: "run-4",
        projectId: "40000000-0000-4000-8000-000000000001",
        userId: "user-1",
        title: "Older terminal",
        inputText: "t2",
        status: "failed",
        refweaverRunId: null,
        refweaverJobId: "job-4",
        createdAt: new Date("2025-03-07T10:00:00.000Z"),
        updatedAt: new Date("2025-03-07T10:00:00.000Z")
      },
      {
        id: "run-5",
        projectId: "40000000-0000-4000-8000-000000000001",
        userId: "user-1",
        title: "Oldest terminal",
        inputText: "t3",
        status: "missing",
        refweaverRunId: null,
        refweaverJobId: "job-5",
        createdAt: new Date("2025-03-06T10:00:00.000Z"),
        updatedAt: new Date("2025-03-06T10:00:00.000Z")
      },
      {
        id: "run-6",
        projectId: "40000000-0000-4000-8000-000000000001",
        userId: "user-1",
        title: "Oldest in progress",
        inputText: "n3",
        status: "queued",
        refweaverRunId: null,
        refweaverJobId: "job-6",
        createdAt: new Date("2025-03-05T10:00:00.000Z"),
        updatedAt: new Date("2025-03-05T10:00:00.000Z")
      }
    ];

    const app = createApp({
      auth: buildAuthStore(),
      runService: createRunService({
        store: createSeededRunStore(seededRows),
        refweaver: {
          async analyze() {
            return {
              runId: "up-run-1",
              status: "queued",
              jobId: "job-1",
              jobUrl: "/jobs/job-1"
            };
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
              name: "Project",
              teamId: null,
              deletedAt: null,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }
        }
      })
    });

    const response = await app.request(
      "/projects/40000000-0000-4000-8000-000000000001/runs?status_group=terminal&page_size=5",
      {
        headers: { cookie: "rw_session=known-token" }
      }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runs.map((run: { title: string }) => run.title)).toEqual([
      "Newest terminal",
      "Older terminal",
      "Oldest terminal"
    ]);
    expect(body.pagination).toEqual({ page: 1, pageSize: 5, hasNext: false, hasPrevious: false });
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

    const ownerApp = createApp({ auth: buildAuthStore("user-1"), runService });
    const otherApp = createApp({ auth: buildAuthStore("user-2"), runService });

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

    const app = createApp({ auth: buildAuthStore("user-1"), runService });
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
