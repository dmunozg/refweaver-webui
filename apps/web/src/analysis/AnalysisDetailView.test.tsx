import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as api from "./api";
import { AnalysisClientError } from "./api";
import { AnalysisDetailView } from "./AnalysisDetailView";
import * as polling from "./polling";
import * as projectModule from "../projects/use-default-project";

const mockedGetRun = vi.spyOn(api, "getRun");
const mockedPollAnalysisRun = vi.spyOn(polling, "pollAnalysisRun");
const mockedUseDefaultProject = vi.spyOn(projectModule, "useDefaultProject");

const baseRun = {
  projectId: "project-1",
  userId: "user-1",
  inputText: "hello world",
  refweaverRunId: null,
  createdAt: "2026-03-25T10:00:00.000Z",
  updatedAt: "2026-03-25T10:05:00.000Z"
};

describe("AnalysisDetailView", () => {
  beforeEach(() => {
    mockedUseDefaultProject.mockReturnValue({ status: "ready", projectId: "project-1" });
    mockedGetRun.mockResolvedValue({
      run: {
        id: "run-1",
        ...baseRun,
        title: "Finished run",
        status: "finished",
        refweaverJobId: null
      }
    } as never);
    mockedPollAnalysisRun.mockImplementation(async (_projectId, run) => run);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  async function renderView(runId = "run-1", onCreateNewAnalysis = vi.fn()) {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<AnalysisDetailView runId={runId} onCreateNewAnalysis={onCreateNewAnalysis} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    return renderer!;
  }

  function getText(renderer: TestRenderer.ReactTestRenderer) {
    return JSON.stringify(renderer.toJSON());
  }

  it("loads and displays a finished run", async () => {
    const renderer = await renderView();

    expect(mockedGetRun).toHaveBeenCalledWith("project-1", "run-1");
    expect(getText(renderer)).toContain("Finished run");
    expect(getText(renderer)).toContain("finished");
    expect(renderer.root.findByType("time").props.dateTime).toBe("2026-03-25T10:00:00.000Z");
  });

  it("polls in-progress runs until they reach a terminal state", async () => {
    vi.useFakeTimers();

    mockedGetRun.mockResolvedValueOnce({
      run: {
        id: "run-1",
        ...baseRun,
        title: "Queued run",
        status: "queued",
        refweaverJobId: "job-1"
      }
    } as never);

    mockedPollAnalysisRun
      .mockResolvedValueOnce({
        id: "run-1",
        ...baseRun,
        title: "Queued run",
        status: "queued",
        refweaverJobId: "job-1"
      })
      .mockResolvedValueOnce({
        id: "run-1",
        ...baseRun,
        title: "Queued run",
        status: "finished",
        refweaverJobId: "job-1"
      });

    const renderer = await renderView();

    expect(mockedPollAnalysisRun).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(mockedPollAnalysisRun).toHaveBeenCalledTimes(2);
    expect(mockedGetRun).toHaveBeenCalledTimes(2);
    expect(getText(renderer)).toContain("finished");
  });

  it("shows a New analysis CTA for failed runs", async () => {
    mockedGetRun.mockResolvedValueOnce({
      run: {
        id: "run-1",
        ...baseRun,
        title: "Failed run",
        status: "missing",
        refweaverJobId: "job-1"
      }
    } as never);

    const onCreateNewAnalysis = vi.fn();
    const renderer = await renderView("run-1", onCreateNewAnalysis);

    expect(getText(renderer)).toContain("failed");
    const button = renderer.root.findAllByType("button").find((entry: { props: { children: string } }) => entry.props.children === "New analysis");

    expect(button).toBeDefined();
    act(() => {
      button?.props.onClick();
    });
    expect(onCreateNewAnalysis).toHaveBeenCalled();
  });

  it("shows failed runs as terminal failures", async () => {
    mockedGetRun.mockResolvedValueOnce({
      run: {
        id: "run-1",
        ...baseRun,
        title: "Failed run",
        status: "failed",
        refweaverJobId: "job-1"
      }
    } as never);

    const renderer = await renderView();

    expect(getText(renderer)).toContain("Failed run");
    expect(getText(renderer)).toContain("failed");
    expect(getText(renderer)).toContain("Terminal state");
  });

  it("shows missing runs clearly", async () => {
    mockedGetRun.mockRejectedValueOnce(new AnalysisClientError("not_found"));

    const renderer = await renderView();

    expect(getText(renderer)).toContain("Analysis run not found");
  });
});
