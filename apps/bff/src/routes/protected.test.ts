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
});
