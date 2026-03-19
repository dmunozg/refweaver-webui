import { describe, expect, it } from "vitest";
import { createApp } from "../app";

function buildAuthStore() {
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
      return { id: "user-1", username: "ada", email: "ada@example.com", name: "Ada", teamId: null };
    },
    async findSessionByTokenHash() {
      return { id: "session-1", userId: "user-1", expiresAt: new Date(Date.now() + 60_000) };
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
              inputText: "hello",
              status: "finished",
              refweaverRunId: "up-run-1",
              refweaverJobId: "job-1",
              createdAt: new Date(),
              updatedAt: new Date()
            }
          };
        }
      }
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
      }
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
      }
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
      }
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
      }
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
        async submitRun(_userId, _projectId, text) {
          submittedText = text;
          return {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
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
      }
    });

    const response = await app.request("/projects/11111111-1111-4111-8111-111111111111/runs", {
      method: "POST",
      headers: { cookie: "rw_session=known-token", "content-type": "application/json" },
      body: JSON.stringify({ text: "  hello world  " })
    });

    expect(response.status).toBe(202);
    expect(submittedText).toBe("hello world");
  });
});
