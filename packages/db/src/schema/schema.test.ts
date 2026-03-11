import { describe, expect, it } from "vitest";
import { projects } from "./projects";
import { users } from "./users";

describe("schema", () => {
  it("includes nullable team placeholders", () => {
    expect(users.teamId).toBeDefined();
    expect(projects.teamId).toBeDefined();
  });
});
