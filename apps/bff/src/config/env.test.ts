import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws on missing DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow("Missing DATABASE_URL");
  });
});
