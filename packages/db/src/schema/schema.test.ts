import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analysisRuns } from "./analysis-runs";
import { projects } from "./projects";
import { users } from "./users";

function readMigrationJournal() {
  const journalPath = join(import.meta.dir, "..", "..", "migrations", "meta", "_journal.json");

  return JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: { idx: number; tag: string }[];
  };
}

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
    expect(analysisRuns.title).toBeDefined();
    expect(analysisRuns.title.notNull).toBe(false);
    expect(analysisRuns.refweaverRunId).toBeDefined();
    expect(analysisRuns.refweaverJobId).toBeDefined();
    expect(analysisRuns.status).toBeDefined();
  });

  it("records the forward-only analysis run title migration", () => {
    const journal = readMigrationJournal();

    expect(journal.entries?.map((entry) => entry.tag)).toContain(
      "0002_analysis_runs_title"
    );
    expect(journal.entries?.at(-1)?.tag).toBe("0002_analysis_runs_title");
  });
});
