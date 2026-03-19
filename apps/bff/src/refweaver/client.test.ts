import { afterEach, describe, expect, it, spyOn, vi } from "vitest";
import {
  RefweaverHttpError,
  RefweaverNetworkError,
  createRefweaverClient
} from "./client";

describe("refweaver client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls analyze with required headers and body", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          run_id: "run-1",
          status: "queued",
          job_id: "job-1",
          job_url: "/jobs/job-1"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const client = createRefweaverClient({
      baseUrl: "http://localhost:8000",
      apiKey: "api-key"
    });

    const result = await client.analyze("user-1", { text: "hello", includeMarkdown: true });
    expect(result.jobId).toBe("job-1");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://localhost:8000/analyze");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["X-User-Id"]).toBe("user-1");
    expect((init?.headers as Record<string, string>)["X-API-Key"]).toBe("api-key");
  });

  it("calls getJob and getRun endpoints", async () => {
    const fetchMock = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "started", job_id: "job-1", user_id: "user-1" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ run: { id: "run-1" }, sentences: [], verdicts: {}, evaluations: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const client = createRefweaverClient({ baseUrl: "http://localhost:8000" });

    const job = await client.getJob("user-1", "job-1");
    const run = await client.getRun("user-1", "run-1");

    expect(job.status).toBe("started");
    expect((run.run as { id: string }).id).toBe("run-1");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:8000/jobs/job-1");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:8000/runs/run-1");
  });

  it("encodes job and run path ids", async () => {
    const fetchMock = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "started", job_id: "job/1", user_id: "user-1" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ run: { id: "run/1" }, sentences: [], verdicts: {}, evaluations: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const client = createRefweaverClient({ baseUrl: "http://localhost:8000" });
    await client.getJob("user-1", "job/1");
    await client.getRun("user-1", "run/1");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:8000/jobs/job%2F1");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:8000/runs/run%2F1");
  });

  it("maps upstream non-2xx into typed http error", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: {
            error_code: "not_found",
            message: "Missing",
            details: null
          }
        }),
        { status: 404, headers: { "content-type": "application/json" } }
      )
    );

    const client = createRefweaverClient({ baseUrl: "http://localhost:8000" });
    await expect(client.getRun("user-1", "missing")).rejects.toMatchObject<RefweaverHttpError>({
      status: 404,
      code: "not_found",
      message: "Missing"
    });
  });

  it("maps network failures into typed network error", async () => {
    spyOn(globalThis, "fetch").mockRejectedValue(new Error("connect failed"));
    const client = createRefweaverClient({ baseUrl: "http://localhost:8000" });

    await expect(client.getJob("user-1", "job-1")).rejects.toBeInstanceOf(RefweaverNetworkError);
  });
});
