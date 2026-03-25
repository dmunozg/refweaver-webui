import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalysisClientError, createRun, formatRunTitle, getRun, listRuns, pollJob } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("analysis api", () => {
  it("formats blank run titles for display", () => {
    expect(formatRunTitle(null)).toBe("(no title)");
    expect(formatRunTitle("   ")).toBe("(no title)");
    expect(formatRunTitle("  Draft analysis  ")).toBe("Draft analysis");
  });

  it("createRun submits text and optional title", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          run: {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: "Draft analysis",
            inputText: "hello world",
            status: "queued",
            refweaverRunId: null,
            refweaverJobId: "job-1",
            createdAt: "2026-03-25T00:00:00.000Z",
            updatedAt: "2026-03-25T00:00:00.000Z"
          }
        }),
        { status: 202 }
      )
    );

    const result = await createRun("project-1", { text: "hello world", title: "Draft analysis" });

    expect(result.run.id).toBe("run-1");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/projects/project-1/runs"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      })
    );
    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.body).toBe(JSON.stringify({ text: "hello world", title: "Draft analysis" }));
  });

  it("createRun maps network and unauthorized failures", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    await expect(createRun("project-1", { text: "hello world" })).rejects.toMatchObject({
      code: "network_error"
    });

    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
    await expect(createRun("project-1", { text: "hello world" })).rejects.toMatchObject({
      code: "unauthorized"
    });
  });

  it("listRuns includes pagination and parses run lists", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          runs: [
            {
              id: "run-1",
              projectId: "project-1",
              userId: "user-1",
              title: null,
              inputText: "hello world",
              status: "done",
              refweaverRunId: "up-1",
              refweaverJobId: "job-1",
              createdAt: "2026-03-25T00:00:00.000Z",
              updatedAt: "2026-03-25T00:00:00.000Z"
            }
          ],
          pagination: { page: 2, pageSize: 5, hasNext: true, hasPrevious: true }
        }),
        { status: 200 }
      )
    );

    const result = await listRuns("project-1", { page: 2, pageSize: 5 });

    expect(result.runs).toHaveLength(1);
    expect(result.pagination).toEqual({ page: 2, pageSize: 5, hasNext: true, hasPrevious: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/projects/project-1/runs?page=2&page_size=5"),
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("listRuns maps malformed JSON payloads to unknown", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{", { status: 200 }));

    await expect(listRuns("project-1")).rejects.toMatchObject({
      code: "unknown"
    });
  });

  it("getRun parses a single run response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          run: {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: "Draft analysis",
            inputText: "hello world",
            status: "queued",
            refweaverRunId: null,
            refweaverJobId: "job-1",
            createdAt: "2026-03-25T00:00:00.000Z",
            updatedAt: "2026-03-25T00:00:00.000Z"
          }
        }),
        { status: 200 }
      )
    );

    const result = (await getRun("project-1", "run-1")) as any;

    expect(result.run.title).toBe("Draft analysis");
  });

  it("getRun parses an optional upstream payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          run: {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: "Draft analysis",
            inputText: "hello world",
            status: "finished",
            refweaverRunId: "up-run-1",
            refweaverJobId: "job-1",
            createdAt: "2026-03-25T00:00:00.000Z",
            updatedAt: "2026-03-25T00:00:00.000Z"
          },
          upstreamRun: {
            run: { id: "up-run-1" },
            sentences: ["s1"],
            verdicts: { overall: "pass" },
            evaluations: ["e1"]
          }
        }),
        { status: 200 }
      )
    );

    const result = await getRun("project-1", "run-1");

    expect((result as any).upstreamRun).toEqual({
      run: { id: "up-run-1" },
      sentences: ["s1"],
      verdicts: { overall: "pass" },
      evaluations: ["e1"]
    });
  });

  it("pollJob parses a job payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "finished",
          jobId: "job-1",
          userId: "user-1",
          runId: "run-1",
          runUrl: "/projects/project-1/runs/run-1"
        }),
        { status: 200 }
      )
    );

    const result = await pollJob("project-1", "job-1");

    expect(result.status).toBe("finished");
    expect(result.runUrl).toBe("/projects/project-1/runs/run-1");
  });

  it("pollJob maps invalid payload shapes to unknown", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: 123 }), { status: 200 })
    );

    await expect(pollJob("project-1", "job-1")).rejects.toMatchObject({
      code: "unknown"
    });
  });
});
