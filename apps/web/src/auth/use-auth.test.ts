import { describe, expect, it } from "vitest";
import { AuthClientError } from "./api";
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
      throw new AuthClientError("unauthorized");
    });

    expect(state.status).toBe("signed_out");
  });

  it("returns error state when /auth/me fails for non-auth reasons", async () => {
    const state = await bootstrapAuthState(async () => {
      throw new AuthClientError("network_error");
    });

    expect(state.status).toBe("error");
    expect(state.error).toBe("Network error while checking session");
  });

  it("maps server session-check failures to a server-specific message", async () => {
    const state = await bootstrapAuthState(async () => {
      throw new AuthClientError("server_error");
    });

    expect(state.status).toBe("error");
    expect(state.error).toBe("Server error while checking session");
  });

  it("maps invalid session payloads to an unexpected-response message", async () => {
    const state = await bootstrapAuthState(async () => {
      throw new AuthClientError("unknown");
    });

    expect(state.status).toBe("error");
    expect(state.error).toBe("Unexpected session response");
  });
});
