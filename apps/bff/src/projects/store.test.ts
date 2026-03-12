import { describe, expect, it } from "vitest";
import { createProjectStore } from "./store";

describe("project store", () => {
  it("exports a runtime factory", () => {
    expect(createProjectStore).toBeTypeOf("function");
  });
});
