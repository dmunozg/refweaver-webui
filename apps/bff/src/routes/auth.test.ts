import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { BetterAuthApp } from "../auth/better-auth";

function buildAuth(): BetterAuthApp {
  return {
    handler: vi.fn(async (request: Request) => {
      return new Response(JSON.stringify({ path: new URL(request.url).pathname }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }),
    api: {
      async getSession() {
        return {
          user: { id: "user-1", username: "ada", email: "ada@example.com", name: "Ada", adminRole: "user", projectId: null }
        };
      }
    }
  };
}

describe("auth routes", () => {
  it("proxies auth requests to Better Auth", async () => {
    const auth = buildAuth();
    const app = createApp({ auth });

    const response = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com", password: "safe-pass" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ path: "/auth/login" });
    expect(auth.handler).toHaveBeenCalledTimes(1);
  });
});
