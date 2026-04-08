import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { BetterAuthApp } from "./auth/better-auth";

function buildAuth(): BetterAuthApp {
  return {
    async handler() {
      return new Response(null, { status: 204 });
    },
    api: {
      async getSession() {
        return {
          user: { id: "user-1", username: "ada", email: "ada@example.com", name: "Ada", adminRole: "user", projectId: null }
        };
      }
    }
  };
}

describe("health route", () => {
  it("returns ok", async () => {
    const app = createApp({ auth: buildAuth() });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("adds CORS headers for allowed origins", async () => {
    const app = createApp({ auth: buildAuth(), allowedOrigins: ["http://vesuvio3:5173"] });

    const res = await app.request("/health", {
      headers: {
        origin: "http://vesuvio3:5173"
      }
    });

    expect(res.headers.get("access-control-allow-origin")).toBe("http://vesuvio3:5173");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not allow disallowed origins", async () => {
    const app = createApp({ auth: buildAuth(), allowedOrigins: ["http://vesuvio3:5173"] });

    const res = await app.request("/health", {
      headers: {
        origin: "http://not-allowed:5173"
      }
    });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("handles preflight requests for allowed origins", async () => {
    const app = createApp({ auth: buildAuth(), allowedOrigins: ["http://vesuvio3:5173"] });

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
    const app = createApp({ auth: buildAuth(), allowedOrigins: ["http://vesuvio3:5173"] });

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
