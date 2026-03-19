import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("health route", () => {
  it("returns ok", async () => {
    const app = createApp({
      signupStore: {
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
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("adds CORS headers for allowed origins", async () => {
    const app = createApp({
      signupStore: {
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
          return null;
        },
        async findSessionByTokenHash() {
          return null;
        },
        async deleteSessionByTokenHash() {
          return;
        }
      },
      allowedOrigins: ["http://vesuvio3:5173"]
    });

    const res = await app.request("/health", {
      headers: {
        origin: "http://vesuvio3:5173"
      }
    });

    expect(res.headers.get("access-control-allow-origin")).toBe("http://vesuvio3:5173");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not allow disallowed origins", async () => {
    const app = createApp({
      signupStore: {
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
          return null;
        },
        async findSessionByTokenHash() {
          return null;
        },
        async deleteSessionByTokenHash() {
          return;
        }
      },
      allowedOrigins: ["http://vesuvio3:5173"]
    });

    const res = await app.request("/health", {
      headers: {
        origin: "http://not-allowed:5173"
      }
    });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("handles preflight requests for allowed origins", async () => {
    const app = createApp({
      signupStore: {
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
          return null;
        },
        async findSessionByTokenHash() {
          return null;
        },
        async deleteSessionByTokenHash() {
          return;
        }
      },
      allowedOrigins: ["http://vesuvio3:5173"]
    });

    const res = await app.request("/auth/me", {
      method: "OPTIONS",
      headers: {
        origin: "http://vesuvio3:5173",
        "access-control-request-method": "GET"
      }
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://vesuvio3:5173");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("does not add allow-origin header to preflight for disallowed origins", async () => {
    const app = createApp({
      signupStore: {
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
          return null;
        },
        async findSessionByTokenHash() {
          return null;
        },
        async deleteSessionByTokenHash() {
          return;
        }
      },
      allowedOrigins: ["http://vesuvio3:5173"]
    });

    const res = await app.request("/auth/me", {
      method: "OPTIONS",
      headers: {
        origin: "http://not-allowed:5173",
        "access-control-request-method": "GET"
      }
    });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
