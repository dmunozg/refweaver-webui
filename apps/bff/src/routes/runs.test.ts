import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import type { BetterAuthApp } from "../auth/better-auth";

function buildAuth(userId = "user-1"): BetterAuthApp {
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
          user: { id: userId, username: "ada", email: "ada@example.com", name: "Ada", adminRole: "user", projectId: null }
        };
      }
    }
  };
}

function buildRunService() {
  return {
    async submitRun() {
      return { id: "run-1", projectId: "project-1", userId: "user-1", inputText: "hello", status: "queued" };
    },
    async listRuns() {
      return [];
    },
    async getRun() {
      return { id: "run-1", projectId: "project-1", userId: "user-1", inputText: "hello", status: "queued" };
    },
    async pollJob() {
      return { status: "queued" };
    }
  };
}

describe("run routes", () => {
  it("submits run lifecycle", async () => {
    const app = createApp({ auth: buildAuth(), runService: buildRunService() as never });
    const response = await app.request("/projects/00000000-0000-4000-8000-000000000001/runs", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "rw_session=known-token" },
      body: JSON.stringify({ text: "hello" })
    });
    expect(response.status).toBe(202);
  });

  it("returns validation error for malformed run route ids", async () => {
    const app = createApp({ auth: buildAuth(), runService: buildRunService() as never });
    const response = await app.request("/projects/not-a-uuid/runs", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(response.status).toBe(422);
  });
});
