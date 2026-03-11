import { describe, expect, it } from "vitest";
import { createApp } from "../app";

function buildStore() {
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

describe("protected routes", () => {
  it("returns 401 when session cookie is missing", async () => {
    const app = createApp({ signupStore: buildStore() });
    const response = await app.request("/protected/ping");
    expect(response.status).toBe(401);
  });

  it("returns 200 when session cookie is valid", async () => {
    const app = createApp({ signupStore: buildStore() });
    const response = await app.request("/protected/ping", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(response.status).toBe(200);
  });

  it("returns 401 when session is expired", async () => {
    const app = createApp({
      signupStore: {
        ...buildStore(),
        async findSessionByTokenHash() {
          return {
            id: "session-1",
            userId: "user-1",
            expiresAt: new Date(Date.now() - 60_000)
          };
        }
      }
    });

    const response = await app.request("/protected/ping", {
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(401);
  });
});
