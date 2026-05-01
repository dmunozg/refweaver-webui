import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws on missing DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow("Missing DATABASE_URL");
  });

  it("throws on missing BETTER_AUTH_SECRET", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/refweaver",
        REFWEAVER_API_BASE_URL: "http://localhost:8000/v1",
        BETTER_AUTH_URL: "http://localhost:3001"
      })
    ).toThrow("Missing BETTER_AUTH_SECRET");
  });

  it("throws on missing BETTER_AUTH_URL", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/refweaver",
        REFWEAVER_API_BASE_URL: "http://localhost:8000/v1",
        BETTER_AUTH_SECRET: "better-auth-secret"
      })
    ).toThrow("Missing BETTER_AUTH_URL");
  });

  it("parses BFF_ALLOWED_ORIGINS as comma-or-space separated list", () => {
    const parsed = parseEnv({
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/refweaver",
      REFWEAVER_API_BASE_URL: "http://localhost:8000/v1",
      BETTER_AUTH_SECRET: "better-auth-secret",
      BETTER_AUTH_URL: "http://localhost:3001",
      BFF_ALLOWED_ORIGINS: "http://localhost:5173 http://vesuvio3:5173,http://127.0.0.1:5173"
    });

    expect(parsed.BFF_ALLOWED_ORIGINS).toEqual([
      "http://localhost:5173",
      "http://vesuvio3:5173",
      "http://127.0.0.1:5173"
    ]);
  });

  it("throws when BFF_ALLOWED_ORIGINS contains malformed values", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/refweaver",
        REFWEAVER_API_BASE_URL: "http://localhost:8000/v1",
        BETTER_AUTH_SECRET: "better-auth-secret",
        BETTER_AUTH_URL: "http://localhost:3001",
        BFF_ALLOWED_ORIGINS: "vesuvio3:5173"
      })
    ).toThrow("Invalid BFF_ALLOWED_ORIGINS entry: vesuvio3:5173");
  });

  it("throws when BFF_ALLOWED_ORIGINS entries include a path", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/refweaver",
        REFWEAVER_API_BASE_URL: "http://localhost:8000/v1",
        BETTER_AUTH_SECRET: "better-auth-secret",
        BETTER_AUTH_URL: "http://localhost:3001",
        BFF_ALLOWED_ORIGINS: "http://vesuvio3:5173/auth"
      })
    ).toThrow("Invalid BFF_ALLOWED_ORIGINS entry: http://vesuvio3:5173/auth");
  });

  it("throws when BFF_ALLOWED_ORIGINS resolves to an empty list", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/refweaver",
        REFWEAVER_API_BASE_URL: "http://localhost:8000/v1",
        BETTER_AUTH_SECRET: "better-auth-secret",
        BETTER_AUTH_URL: "http://localhost:3001",
        BFF_ALLOWED_ORIGINS: "   "
      })
    ).toThrow("BFF_ALLOWED_ORIGINS must include at least one origin");
  });

  it("does not require SESSION_SECRET", () => {
    const parsed = parseEnv({
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/refweaver",
      REFWEAVER_API_BASE_URL: "http://localhost:8000/v1",
      BETTER_AUTH_SECRET: "better-auth-secret",
      BETTER_AUTH_URL: "http://localhost:3001"
    });

    expect(parsed.BETTER_AUTH_URL).toBe("http://localhost:3001");
  });
});
