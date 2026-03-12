import { describe, expect, it } from "vitest";
import { createRunStore } from "./store";

describe("run store", () => {
  it("exports a runtime factory", () => {
    expect(createRunStore).toBeTypeOf("function");
  });
});
