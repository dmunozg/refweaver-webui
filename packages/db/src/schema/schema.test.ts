import { describe, expect, it } from "vitest";
import { analysisRuns } from "./analysis-runs";
import { projects } from "./projects";
import { users } from "./users";

describe("schema", () => {
  it("includes nullable team placeholders", () => {
    expect(users.teamId).toBeDefined();
    expect(projects.teamId).toBeDefined();
  });

  it("supports project soft deletion", () => {
    expect(projects.deletedAt).toBeDefined();
  });

  it("includes analysis run tracking table", () => {
    expect(analysisRuns.projectId).toBeDefined();
    expect(analysisRuns.userId).toBeDefined();
    expect(analysisRuns.refweaverRunId).toBeDefined();
    expect(analysisRuns.refweaverJobId).toBeDefined();
    expect(analysisRuns.status).toBeDefined();
  });
});
