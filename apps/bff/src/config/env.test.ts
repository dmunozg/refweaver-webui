import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws on missing DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow("Missing DATABASE_URL");
  });

  it("parses BFF_ALLOWED_ORIGINS as comma-or-space separated list", () => {
    const parsed = parseEnv({
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/refweaver",
      SESSION_SECRET: "secret",
      REFWEAVER_API_BASE_URL: "http://localhost:8000/v1",
      BFF_ALLOWED_ORIGINS: "http://localhost:5173 http://vesuvio3:5173,http://127.0.0.1:5173"
    });

    expect(parsed.BFF_ALLOWED_ORIGINS).toEqual([
      "http://localhost:5173",
      "http://vesuvio3:5173",
      "http://127.0.0.1:5173"
    ]);
  });
});
