import { afterEach, describe, expect, it, vi } from "vitest";
import { getPollingDelayMs, pollAnalysisRun, isTerminalRunStatus } from "./polling";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("polling", () => {
  it("treats terminal statuses as terminal", () => {
    expect(isTerminalRunStatus("finished")).toBe(true);
    expect(isTerminalRunStatus("failed")).toBe(true);
    expect(isTerminalRunStatus("missing")).toBe(true);
    expect(isTerminalRunStatus("running")).toBe(false);
  });

  it("returns the latest run status from the job poll endpoint", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "finished",
          jobId: "job-1",
          userId: "user-1",
          runId: "run-1"
        }),
        { status: 200 }
      )
    );

    const result = await pollAnalysisRun("project-1", {
      id: "run-1",
      projectId: "project-1",
      userId: "user-1",
      title: "Run",
      inputText: "hello world",
      status: "queued",
      refweaverRunId: null,
      refweaverJobId: "job-1",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z"
    });

    expect(result.status).toBe("finished");
  });

  it("maps a missing job to a missing run", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    const result = await pollAnalysisRun("project-1", {
      id: "run-1",
      projectId: "project-1",
      userId: "user-1",
      title: "Run",
      inputText: "hello world",
      status: "running",
      refweaverRunId: null,
      refweaverJobId: "job-1",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z"
    });

    expect(result.status).toBe("missing");
  });

  it("uses a 1s then 2s backoff cadence", () => {
    expect(getPollingDelayMs(0)).toBe(1000);
    expect(getPollingDelayMs(1)).toBe(1000);
    expect(getPollingDelayMs(2)).toBe(1000);
    expect(getPollingDelayMs(3)).toBe(2000);
  });
});
