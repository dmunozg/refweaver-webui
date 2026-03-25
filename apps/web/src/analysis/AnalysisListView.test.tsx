import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as api from "./api";
import { AnalysisListView } from "./AnalysisListView";
import * as projectModule from "../projects/use-default-project";

const mockedListRuns = vi.spyOn(api, "listRuns");
const mockedUseDefaultProject = vi.spyOn(projectModule, "useDefaultProject");

describe("AnalysisListView", () => {
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

  async function renderView() {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<AnalysisListView />);
      await Promise.resolve();
      await Promise.resolve();
    });

    return renderer!;
  }

  function getText(renderer: TestRenderer.ReactTestRenderer) {
    return JSON.stringify(renderer.toJSON());
  }

  it("loads the first page from the default project and renders runs newest-first", async () => {
    mockedListRuns.mockResolvedValueOnce({
      runs: [
        {
          id: "run-1",
          projectId: "project-1",
          userId: "user-1",
          title: "Newest analysis",
          inputText: "hello world",
          status: "finished",
          refweaverRunId: null,
          refweaverJobId: null,
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-25T10:05:00.000Z"
        },
        {
          id: "run-2",
          projectId: "project-1",
          userId: "user-1",
          title: "Older analysis",
          inputText: "hello again",
          status: "finished",
          refweaverRunId: null,
          refweaverJobId: null,
          createdAt: "2026-03-24T10:00:00.000Z",
          updatedAt: "2026-03-24T10:05:00.000Z"
        }
      ],
      pagination: { page: 1, pageSize: 10, hasNext: false, hasPrevious: false }
    });

    const renderer = await renderView();

    expect(mockedListRuns).toHaveBeenCalledWith("project-1", { page: 1, pageSize: 10 });
    expect(renderer.root.findByType("h1").props.children).toBe("Analysis list");
    expect(getText(renderer)).toContain("Newest analysis");
    expect(getText(renderer)).toContain("Older analysis");
    expect(renderer.root.findAllByType("strong").map((item) => item.props.children)).toEqual([
      "Newest analysis",
      "Older analysis"
    ]);
  });

  it("moves between pages with previous and next controls", async () => {
    mockedListRuns
      .mockResolvedValueOnce({
        runs: [
          {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: "Page one run",
            inputText: "hello world",
            status: "finished",
            refweaverRunId: null,
            refweaverJobId: null,
            createdAt: "2026-03-25T10:00:00.000Z",
            updatedAt: "2026-03-25T10:05:00.000Z"
          }
        ],
        pagination: { page: 1, pageSize: 10, hasNext: true, hasPrevious: false }
      })
      .mockResolvedValueOnce({
        runs: [
          {
            id: "run-2",
            projectId: "project-1",
            userId: "user-1",
            title: "Page two run",
            inputText: "hello again",
            status: "running",
            refweaverRunId: null,
            refweaverJobId: null,
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-24T10:05:00.000Z"
          }
        ],
        pagination: { page: 2, pageSize: 10, hasNext: false, hasPrevious: true }
      })
      .mockResolvedValueOnce({
        runs: [
          {
            id: "run-1",
            projectId: "project-1",
            userId: "user-1",
            title: "Page one run",
            inputText: "hello world",
            status: "finished",
            refweaverRunId: null,
            refweaverJobId: null,
            createdAt: "2026-03-25T10:00:00.000Z",
            updatedAt: "2026-03-25T10:05:00.000Z"
          }
        ],
        pagination: { page: 1, pageSize: 10, hasNext: true, hasPrevious: false }
      });

    const renderer = await renderView();
    const buttons = () => renderer.root.findAllByType("button");

    expect(getText(renderer)).toContain("Page 1");

    await act(async () => {
      buttons().find((button) => button.props.children === "Next")?.props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedListRuns).toHaveBeenNthCalledWith(2, "project-1", { page: 2, pageSize: 10 });
    expect(getText(renderer)).toContain("Page 2");
    expect(getText(renderer)).toContain("Page two run");

    await act(async () => {
      buttons().find((button) => button.props.children === "Previous")?.props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedListRuns).toHaveBeenNthCalledWith(3, "project-1", { page: 1, pageSize: 10 });
    expect(getText(renderer)).toContain("Page 1");
    expect(getText(renderer)).toContain("Page one run");
  });

  it("falls back to the default title and shows a compact status marker", async () => {
    mockedListRuns.mockResolvedValueOnce({
      runs: [
        {
          id: "run-1",
          projectId: "project-1",
          userId: "user-1",
          title: "   ",
          inputText: "hello world",
          status: "failed",
          refweaverRunId: null,
          refweaverJobId: null,
          createdAt: "2026-03-25T10:00:00.000Z",
          updatedAt: "2026-03-25T10:05:00.000Z"
        }
      ],
      pagination: { page: 1, pageSize: 10, hasNext: false, hasPrevious: false }
    });

    const renderer = await renderView();

    expect(getText(renderer)).toContain("(no title)");
    expect(renderer.root.findByProps({ "aria-label": "Status: failed" })).toBeDefined();
  });
});
