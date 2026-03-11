import { describe, expect, it } from "vitest";
import { bootstrapAuthState } from "./use-auth";

describe("bootstrapAuthState", () => {
  it("returns authenticated state when /auth/me succeeds", async () => {
    const state = await bootstrapAuthState(async () => ({
      user: {
        id: "user-1",
        username: "ada",
        email: "ada@example.com",
        name: "Ada",
        teamId: null
      }
    }));

    expect(state.status).toBe("authenticated");
    expect(state.user?.id).toBe("user-1");
  });

  it("returns signed out state when /auth/me returns unauthorized", async () => {
    const state = await bootstrapAuthState(async () => {
      throw new Error("unauthorized");
    });

    expect(state.status).toBe("signed_out");
  });
});
