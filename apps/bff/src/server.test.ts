import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("health route", () => {
  it("returns ok", async () => {
    const app = createApp({
      signupStore: {
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
        }
      }
    });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});
