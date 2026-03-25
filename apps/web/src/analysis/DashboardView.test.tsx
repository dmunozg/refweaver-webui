import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as api from "./api";
import { DashboardView } from "./DashboardView";
import * as polling from "./polling";
import * as projectModule from "../projects/use-default-project";

const mockedListRuns = vi.spyOn(api, "listRuns");
const mockedPollAnalysisRun = vi.spyOn(polling, "pollAnalysisRun");
const mockedUseDefaultProject = vi.spyOn(projectModule, "useDefaultProject");

const baseRun = {
  projectId: "project-1",
  userId: "user-1",
  inputText: "hello world",
  refweaverRunId: null,
  refweaverJobId: "job-1",
  updatedAt: "2026-03-25T00:00:00.000Z"
};

describe("DashboardView", () => {
  beforeEach(() => {
    mockedUseDefaultProject.mockReturnValue({ status: "ready", projectId: "project-1" });
    mockedListRuns.mockResolvedValue({
      runs: [],
      pagination: { page: 1, pageSize: 10, hasNext: false, hasPrevious: false }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  async function renderView(onCreateNewAnalysis = vi.fn(), onViewAllAnalyses = vi.fn()) {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <DashboardView onCreateNewAnalysis={onCreateNewAnalysis} onViewAllAnalyses={onViewAllAnalyses} />
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    return renderer!;
  }

  function getText(renderer: TestRenderer.ReactTestRenderer) {
    return JSON.stringify(renderer.toJSON());
  }

  it("splits runs into in-progress and past sections in newest-first order", async () => {
    mockedListRuns.mockResolvedValueOnce({
      runs: [
        {
          id: "run-1",
          ...baseRun,
          title: "Older finished",
          status: "finished",
          createdAt: "2026-03-24T10:00:00.000Z",
          refweaverJobId: "job-1"
        },
        {
          id: "run-2",
          ...baseRun,
          title: "  ",
          status: "running",
          createdAt: "2026-03-25T10:00:00.000Z",
          refweaverJobId: "job-2"
        },
        {
          id: "run-3",
          ...baseRun,
          title: null,
          status: "missing",
          createdAt: "2026-03-24T12:00:00.000Z",
          refweaverJobId: "job-3"
        }
      ],
      pagination: { page: 1, pageSize: 10, hasNext: false, hasPrevious: false }
    });

    const renderer = await renderView();
    const headings = renderer.root.findAllByType("h2").map((heading: { props: { children: unknown } }) => heading.props.children);

    expect(headings).toEqual(["In progress", "Past analyses"]);
    expect(getText(renderer)).toContain("Older finished");
    expect(getText(renderer)).toContain("(no title)");
    expect(getText(renderer)).toContain("running");
    expect(getText(renderer)).toContain("failed");
    expect(getText(renderer)).not.toContain("missing");
  });

  it("caps the terminal list at five runs", async () => {
    mockedListRuns.mockResolvedValueOnce({
      runs: [
        ...Array.from({ length: 7 }, (_, index) => ({
          id: `run-${index + 1}`,
          ...baseRun,
          title: `Finished ${index + 1}`,
          status: "finished",
          createdAt: `2026-03-${String(25 - index).padStart(2, "0")}T10:00:00.000Z`,
          refweaverJobId: `job-${index + 1}`
        }))
      ],
      pagination: { page: 1, pageSize: 10, hasNext: false, hasPrevious: false }
    });

    const renderer = await renderView();
    const text = getText(renderer);

    expect(text).toContain("Finished 1");
    expect(text).toContain("Finished 5");
    expect(text).not.toContain("Finished 6");
    expect(text).not.toContain("Finished 7");
  });

  it("moves an in-progress run into the terminal list after polling finishes", async () => {
    mockedListRuns.mockResolvedValueOnce({
      runs: [
        {
          id: "run-1",
          ...baseRun,
          title: "Polled run",
          status: "queued",
          createdAt: "2026-03-25T10:00:00.000Z",
          refweaverJobId: "job-1"
        }
      ],
      pagination: { page: 1, pageSize: 10, hasNext: false, hasPrevious: false }
    });
    mockedPollAnalysisRun.mockResolvedValueOnce({
      id: "run-1",
      ...baseRun,
      title: "Polled run",
      status: "finished",
      createdAt: "2026-03-25T10:00:00.000Z",
      refweaverJobId: "job-1"
    });

    const renderer = await renderView();

    expect(mockedPollAnalysisRun).toHaveBeenCalledWith("project-1", expect.objectContaining({ id: "run-1" }));
    const text = getText(renderer);

    expect(text).toContain("finished");
    expect(text).not.toContain("queued");
  });

  it("shows failed and missing terminal statuses clearly", async () => {
    mockedListRuns.mockResolvedValueOnce({
      runs: [
        {
          id: "run-1",
          ...baseRun,
          title: "Failed run",
          status: "failed",
          createdAt: "2026-03-25T10:00:00.000Z",
          refweaverJobId: "job-1"
        },
        {
          id: "run-2",
          ...baseRun,
          title: null,
          status: "missing",
          createdAt: "2026-03-24T10:00:00.000Z",
          refweaverJobId: "job-2"
        }
      ],
      pagination: { page: 1, pageSize: 10, hasNext: false, hasPrevious: false }
    });

    const renderer = await renderView();
    const text = getText(renderer);

    expect(text).toContain("failed");
    expect(text).toContain("failed");
    expect(text).not.toContain("missing");
  });

  it("shows a View all action", async () => {
    const onViewAllAnalyses = vi.fn();
    const renderer = await renderView(vi.fn(), onViewAllAnalyses);

    const viewAllButton = renderer.root.findAllByType("button").find((button: { props: { children: string } }) => button.props.children === "View all");
    expect(viewAllButton).toBeDefined();

    act(() => {
      viewAllButton?.props.onClick();
    });

    expect(onViewAllAnalyses).toHaveBeenCalled();
  });
});
