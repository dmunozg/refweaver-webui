import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { BetterAuthApp } from "../auth/better-auth";

function buildAuth(userId = "user-1"): BetterAuthApp {
  return {
    async handler() {
      return new Response(null, { status: 204 });
    },
    api: {
      async getSession({ headers }) {
        const cookie = headers.get("cookie");
        if (!cookie) {
          return null;
        }

        return {
          user: { id: userId, username: "ada", email: "ada@example.com", name: "Ada", adminRole: "user", projectId: null }
        };
      }
    }
  };
}

describe("protected routes", () => {
  it("returns 401 when session cookie is missing", async () => {
    const app = createApp({ auth: buildAuth() });
    const response = await app.request("/protected/ping");
    expect(response.status).toBe(401);
  });

  it("returns 200 when session cookie is valid", async () => {
    const app = createApp({ auth: buildAuth() });
    const response = await app.request("/protected/ping", {
      headers: { cookie: "rw_session=known-token" }
    });
    expect(response.status).toBe(200);
  });

  it("returns 401 when session is expired", async () => {
    const app = createApp({
      auth: {
        ...buildAuth(),
        api: {
          async getSession() {
            return null;
          }
        }
      }
    });

    const response = await app.request("/protected/ping", {
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(401);
  });

  it("returns 503 when getSession throws", async () => {
    const app = createApp({
      auth: {
        ...buildAuth(),
        api: {
          async getSession() {
            throw new Error("auth backend unavailable");
          }
        }
      }
    });

    const response = await app.request("/protected/ping", {
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("auth_unavailable");
  });

  it("logs structured error when getSession throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const app = createApp({
      auth: {
        ...buildAuth(),
        api: {
          async getSession() {
            throw new Error("auth backend unavailable");
          }
        }
      }
    });

    const response = await app.request("/protected/ping", {
      headers: { cookie: "rw_session=known-token" }
    });

    expect(response.status).toBe(503);

    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.event).toBe("auth.session_lookup_failed");
    expect(logged.path).toBe("/protected/ping");
    expect(logged.method).toBe("GET");
    expect(logged.error).toBe("auth backend unavailable");

    spy.mockRestore();
  });
});
