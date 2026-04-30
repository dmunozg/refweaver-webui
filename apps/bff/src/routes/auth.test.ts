import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { BetterAuthApp } from "../auth/better-auth";

function buildAuth(): BetterAuthApp {
  return {
    handler: vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      if (url.pathname === "/auth/sign-in" && request.method === "POST") {
        const body = await request.json();
        if (body.password === "wrong") {
          return new Response(JSON.stringify({ error: "invalid credentials" }), {
            status: 401,
            headers: { "content-type": "application/json" }
          });
        }
        if (body.email !== "ada@example.com") {
          return new Response(JSON.stringify({ error: "user not found" }), {
            status: 401,
            headers: { "content-type": "application/json" }
          });
        }
      }
      if (url.pathname === "/auth/sign-up" && request.method === "POST") {
        const body = await request.json();
        if (!body.email || !body.email.includes("@")) {
          return new Response(JSON.stringify({ error: "invalid email" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          });
        }
      }
      return new Response(JSON.stringify({ path: url.pathname }), {
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

  it("rejects invalid password with 401", async () => {
    const auth = buildAuth();
    const app = createApp({ auth });

    const response = await app.request("/auth/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com", password: "wrong" })
    });

    expect(response.status).toBe(401);
  });

  it("rejects unknown email with 401", async () => {
    const auth = buildAuth();
    const app = createApp({ auth });

    const response = await app.request("/auth/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "unknown@example.com", password: "any-password" })
    });

    expect(response.status).toBe(401);
    expect(auth.handler).toHaveBeenCalled();
  });

  it("rejects malformed email with 400", async () => {
    const auth = buildAuth();
    const app = createApp({ auth });

    const response = await app.request("/auth/sign-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "password123" })
    });

    expect(response.status).toBe(400);
  });
});
