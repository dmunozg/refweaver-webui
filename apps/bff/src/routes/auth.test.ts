import { describe, expect, it } from "vitest";
import { createApp } from "../app";

describe("auth routes", () => {
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
});
