import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createRunService } from "../runs/service";
import type { AuthStore } from "../auth/store";

function buildAuthStore(): AuthStore {
  return {
    async withTransaction<T>(fn: (txStore: any) => Promise<T>) {
      return fn(this);
    },
    async createUser() {
      return { id: "user-1" };
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
        id: "user-1",
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
        userId: "user-1",
        sessionTokenHash: "hash",
        expiresAt: new Date(Date.now() + 60_000)
      };
    },
    async deleteSessionByTokenHash() {
      return;
    }
  };
}

describe("run routes", () => {
  it("submits, lists, and polls run lifecycle", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          return {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: null,
            inputText: "hello",
            status: "queued",
            refweaverRunId: "up-run-1",
            refweaverJobId: "job-1",
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async listRuns() {
          return [
            {
              id: "run-1",
              projectId: "project-1",
              userId: "user-1",
              title: null,
              inputText: "hello",
              status: "queued",
              refweaverRunId: "up-run-1",
              refweaverJobId: "job-1",
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ];
        },
        async getRun() {
          return {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: null,
            inputText: "hello",
            status: "finished",
            refweaverRunId: "up-run-1",
            refweaverJobId: "job-1",
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async pollJob() {
          return {
            status: "finished",
            run: {
              id: "run-1",
              projectId: "project-1",
              userId: "user-1",
              title: null,
              inputText: "hello",
              status: "finished",
              refweaverRunId: "up-run-1",
              refweaverJobId: "job-1",
              createdAt: new Date(),
              updatedAt: new Date()
            }
          };
        }
      } as any
    });

    const createResponse = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "hello" })
    });
    expect(createResponse.status).toBe(202);

    const listResponse = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(listResponse.status).toBe(200);

    const jobResponse = await app.request(
      "/projects/11111111-1111-4111-8111-111111111111/jobs/22222222-2222-4222-8222-222222222222",
      {
        headers: { cookie: "rw_session=known-token" }
      }
    );
    expect(jobResponse.status).toBe(200);
  });

  it("returns upstream payload with the local run detail response", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          return {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: null,
            inputText: "hello",
            status: "finished",
            refweaverRunId: "up-run-1",
            refweaverJobId: "job-1",
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          return {
            run: {
              id: "run-1",
              projectId: "project-1",
              userId: "user-1",
              title: null,
              inputText: "hello",
              status: "finished",
              refweaverRunId: "up-run-1",
              refweaverJobId: "job-1",
              createdAt: new Date(),
              updatedAt: new Date()
            },
            upstreamRun: {
              run: { id: "up-run-1" },
              sentences: [],
              verdicts: {},
              evaluations: []
            }
          };
        },
        async pollJob() {
          return {
            status: "finished",
            run: {
              id: "run-1",
              projectId: "project-1",
              userId: "user-1",
              title: null,
              inputText: "hello",
              status: "finished",
              refweaverRunId: "up-run-1",
              refweaverJobId: "job-1",
              createdAt: new Date(),
              updatedAt: new Date()
            }
          };
        }
      } as any
    });

    const response = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs/11111111-1111-4111-8111-111111111112", {
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.run.id).toBe("run-1");
    expect(body.upstreamRun.run.id).toBe("up-run-1");
  });

  it("maps inactive project errors to normalized envelope", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          const { ProjectInactiveError } = await import("../runs/service");
          throw new ProjectInactiveError();
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "hello" })
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("project_inactive");
  });

  it("returns validation error for malformed run route ids", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          throw new Error("unused");
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request("/projects/not-a-uuid/runs", {
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
  });

  it("returns validation error for malformed JSON body", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          throw new Error("unused");
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: "{"
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
  });

  it("returns validation error for non-string text", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          throw new Error("unused");
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      }
    });

    const response = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: 123 })
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
  });

  it("rejects blank run text after trim before submit", async () => {
    let submitCalls = 0;
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          submitCalls += 1;
          throw new Error("unused");
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "   \n\t  " })
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
    expect(submitCalls).toBe(0);
  });

  it("trims run text before submit", async () => {
    let submittedText: string | null = null;
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun(_userId: string, _projectId: string, text: string) {
          submittedText = text;
          return {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: null,
            inputText: text,
            status: "queued",
            refweaverRunId: "up-run-1",
            refweaverJobId: "job-1",
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "  hello world  " })
    });

    expect(response.status).toBe(202);
    expect(submittedText).toBe("hello world");
  });

  it("accepts an optional run title when submitting", async () => {
    let submittedTitle: string | null = null;
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun(_userId: string, _projectId: string, text: string, title: string | undefined) {
          submittedTitle = title ?? null;
          return {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: title ?? null,
            inputText: text,
            status: "queued",
            refweaverRunId: "up-run-1",
            refweaverJobId: "job-1",
            createdAt: new Date(),
            updatedAt: new Date()
          };
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "hello", title: "  Draft analysis  " })
    });

    expect(response.status).toBe(202);
    expect(submittedTitle).toBe("  Draft analysis  ");
  });

  it("returns paginated run listings", async () => {
    let receivedPagination: { limit: number; offset: number } | null = null;
    const runs = Array.from({ length: 6 }, (_, index) => ({
      id: `run-${index + 1}`,
      projectId: "project-1",
      userId: "user-1",
      title: `Run ${index + 1}`,
      inputText: `input-${index + 1}`,
      status: "queued",
      refweaverRunId: `up-run-${index + 1}`,
      refweaverJobId: `job-${index + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          throw new Error("unused");
        },
        async listRuns(
          _userId: string,
          _projectId: string,
          pagination?: { limit: number; offset: number; statusGroup?: string }
        ) {
          receivedPagination = pagination ?? null;
          return runs;
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request(
      "/projects/11111111-1111-4111-8111-111111111111/runs?page=2&page_size=5",
      {
        headers: { cookie: "rw_session=known-token" }
      }
    );

    expect(response.status).toBe(200);
    expect(receivedPagination).toEqual({ limit: 6, offset: 5, statusGroup: "all" });
    const body = await response.json();
    expect(body.runs).toHaveLength(5);
    expect(body.pagination).toEqual({ page: 2, pageSize: 5, hasNext: true, hasPrevious: true });
  });

  it("rejects out-of-range page and page_size values while accepting bounds", async () => {
    const cases = [
      { query: "?page=0", status: 422, called: false },
      { query: "?page=10001", status: 422, called: false },
      { query: "?page_size=0", status: 422, called: false },
      { query: "?page_size=101", status: 422, called: false },
      {
        query: "?page=1&page_size=1",
        status: 200,
        called: true,
        pagination: { limit: 2, offset: 0, statusGroup: "all" }
      },
      {
        query: "?page=10000&page_size=100",
        status: 200,
        called: true,
        pagination: { limit: 101, offset: 999900, statusGroup: "all" }
      }
    ] as const;

    for (const testCase of cases) {
      let receivedPagination: { limit: number; offset: number; statusGroup?: string } | null = null;
      let listRunsCalls = 0;

      const app = createApp({
        signupStore: buildAuthStore(),
        runService: {
          async submitRun() {
            throw new Error("unused");
          },
          async listRuns(_userId: string, _projectId: string, pagination?: { limit: number; offset: number; statusGroup?: string }) {
            listRunsCalls += 1;
            receivedPagination = pagination ?? null;
            return [];
          },
          async getRun() {
            throw new Error("unused");
          },
          async pollJob() {
            throw new Error("unused");
          }
        } satisfies ReturnType<typeof createRunService>
      });

      const response = await app.request(`/projects/11111111-1111-4111-8111-111111111111/runs${testCase.query}`, {
        headers: { cookie: "rw_session=known-token" }
      });

      expect(response.status).toBe(testCase.status);
      expect(listRunsCalls).toBe(testCase.called ? 1 : 0);

      const body = await response.json();
      if (testCase.status === 200) {
        expect(receivedPagination).toEqual(testCase.pagination);
        expect(body.pagination).toEqual({
          page: Number(new URLSearchParams(testCase.query).get("page") ?? "1"),
          pageSize: Number(new URLSearchParams(testCase.query).get("page_size") ?? "10"),
          hasNext: false,
          hasPrevious: Number(new URLSearchParams(testCase.query).get("page") ?? "1") > 1
        });
      } else {
        expect(body.error.code).toBe("validation_error");
      }
    }
  });

  it("rejects invalid status_group values", async () => {
    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          throw new Error("unused");
        },
        async listRuns() {
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request(
      "/projects/11111111-1111-4111-8111-111111111111/runs?status_group=oldest",
      {
        headers: { cookie: "rw_session=known-token" }
      }
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
  });

  it("forwards status_group to the run service", async () => {
    let receivedPagination: { limit: number; offset: number; statusGroup?: string } | null = null;

    const app = createApp({
      signupStore: buildAuthStore(),
      runService: {
        async submitRun() {
          throw new Error("unused");
        },
        async listRuns(_userId: string, _projectId: string, pagination?: { limit: number; offset: number; statusGroup?: string }) {
          receivedPagination = pagination ?? null;
          return [];
        },
        async getRun() {
          throw new Error("unused");
        },
        async pollJob() {
          throw new Error("unused");
        }
      } satisfies ReturnType<typeof createRunService>
    });

    const response = await app.request(
      "/projects/11111111-1111-4111-8111-111111111111/runs?status_group=terminal&page=3&page_size=4",
      {
        headers: { cookie: "rw_session=known-token" }
      }
    );

    expect(response.status).toBe(200);
    expect(receivedPagination).toEqual({ limit: 5, offset: 8, statusGroup: "terminal" });
  });
});
