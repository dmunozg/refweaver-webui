import { describe, expect, it } from "vitest";
import { login } from "./login";

describe("login", () => {
  it("creates a session for valid credentials", async () => {
    const store = {
      async withTransaction<T>(fn: (txStore: typeof store) => Promise<T>) {
        return fn(store);
      },
      async findUserByIdentifier() {
        return {
          id: "user-1",
          passwordHash: await Bun.password.hash("safe-pass")
        };
      },
      async createSession() {
        return { id: "session-1" };
      }
    };

    const result = await login({ identifier: "ada", password: "safe-pass" }, store);
    expect(result.userId).toBe("user-1");
    expect(result.sessionId).toBe("session-1");
    expect(result.sessionToken).toBeTypeOf("string");
  });

  it("throws for invalid credentials", async () => {
    const store = {
      async withTransaction<T>(fn: (txStore: typeof store) => Promise<T>) {
        return fn(store);
      },
      async findUserByIdentifier() {
        return {
          id: "user-1",
          passwordHash: await Bun.password.hash("safe-pass")
        };
      },
      async createSession() {
        return { id: "session-1" };
      }
    };

    await expect(login({ identifier: "ada", password: "wrong-pass" }, store)).rejects.toThrow(
      "invalid_credentials"
    );
  });
});
