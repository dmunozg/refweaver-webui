import { describe, expect, it } from "vitest";
import { createApp } from "../app";

describe("auth routes", () => {
  function buildStore() {
    return {
      async withTransaction<T>(fn: () => Promise<T>) {
        return fn();
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
        return {
          id: "user-1",
          username: "ada",
          email: "ada@example.com",
          name: "Ada",
          passwordHash: await Bun.password.hash("safe-pass")
        };
      },
      async findUserById() {
        return {
          id: "user-1",
          username: "ada",
          email: "ada@example.com",
          name: "Ada",
          teamId: null
        };
      },
      async findSessionByTokenHash() {
        return { id: "session-1", userId: "user-1" };
      },
      async deleteSessionByTokenHash() {
        return;
      }
    };
  }

  it("returns 409 for duplicate username/email", async () => {
    const duplicateError = Object.assign(new Error("duplicate"), { code: "23505" });

    const app = createApp({
      signupStore: {
        async withTransaction<T>(fn: () => Promise<T>) {
          return fn();
        },
        async createUser() {
          throw duplicateError;
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
          return null;
        },
        async findSessionByTokenHash() {
          return null;
        },
        async deleteSessionByTokenHash() {
          return;
        }
      }
    });

    const response = await app.request("/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "ada",
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "safe-pass"
      })
    });

    expect(response.status).toBe(409);
  });

  it("logs in and sets session cookie", async () => {
    const app = createApp({ signupStore: buildStore() });

    const response = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "ada", password: "safe-pass" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("rw_session=");
  });

  it("returns current user from session", async () => {
    const app = createApp({ signupStore: buildStore() });

    const response = await app.request("/auth/me", {
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.id).toBe("user-1");
  });

  it("logs out and clears cookie", async () => {
    const app = createApp({ signupStore: buildStore() });

    const response = await app.request("/auth/logout", {
      method: "POST",
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("rw_session=");
  });
});
