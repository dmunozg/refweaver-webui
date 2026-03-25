import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("./api", () => ({
  createRun: vi.fn()
}));

vi.mock("../projects/use-default-project", () => ({
  useDefaultProject: vi.fn()
}));

import { createRun } from "./api";
import { NewAnalysisView } from "./NewAnalysisView";
import { useDefaultProject } from "../projects/use-default-project";

const mockedCreateRun = vi.mocked(createRun);
const mockedUseDefaultProject = vi.mocked(useDefaultProject);

describe("NewAnalysisView", () => {
  beforeEach(() => {
    mockedUseDefaultProject.mockReturnValue({ status: "ready", projectId: "project-1" });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  async function renderView(onSubmitSuccess = vi.fn()) {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<NewAnalysisView onSubmitSuccess={onSubmitSuccess} />);
    });

    return renderer!;
  }

  it("submits an optional title with trimmed text", async () => {
    mockedCreateRun.mockResolvedValue({ run: { id: "run-1" } } as never);

    const onSubmitSuccess = vi.fn();
    const renderer = await renderView(onSubmitSuccess);
    const [titleInput] = renderer.root.findAllByType("input");
    const textArea = renderer.root.findByType("textarea");
    const form = renderer.root.findByType("form");

    await act(async () => {
      titleInput.props.onChange({ target: { value: "Draft analysis" } });
    });

    await act(async () => {
      textArea.props.onChange({ target: { value: "  hello world  " } });
    });

    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} });
    });

    expect(mockedCreateRun).toHaveBeenCalledWith("project-1", {
      text: "hello world",
      title: "Draft analysis"
    });
    expect(onSubmitSuccess).toHaveBeenCalledTimes(1);
  });

  it("omits a blank title when submitting", async () => {
    mockedCreateRun.mockResolvedValue({ run: { id: "run-1" } } as never);

    const renderer = await renderView();
    const [titleInput] = renderer.root.findAllByType("input");
    const textArea = renderer.root.findByType("textarea");
    const form = renderer.root.findByType("form");

    await act(async () => {
      titleInput.props.onChange({ target: { value: "   " } });
    });

    await act(async () => {
      textArea.props.onChange({ target: { value: "  hello world  " } });
    });

    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} });
    });

    expect(mockedCreateRun).toHaveBeenCalledWith("project-1", {
      text: "hello world",
      title: null
    });
  });

  it("rejects blank analysis text after trimming", async () => {
    const renderer = await renderView();
    const textArea = renderer.root.findByType("textarea");
    const form = renderer.root.findByType("form");

    await act(async () => {
      textArea.props.onChange({ target: { value: "   " } });
    });

    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} });
    });

    expect(mockedCreateRun).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Analysis text is required");
  });

  it("prevents duplicate submits while the request is in flight", async () => {
    let resolveRun: ((value: any) => void) | undefined;
    mockedCreateRun.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRun = resolve;
        })
    );

    const renderer = await renderView();
    const textArea = renderer.root.findByType("textarea");
    const form = renderer.root.findByType("form");

    await act(async () => {
      textArea.props.onChange({ target: { value: "hello world" } });
    });

    await act(async () => {
      void form.props.onSubmit({ preventDefault() {} });
      void form.props.onSubmit({ preventDefault() {} });
    });

    expect(mockedCreateRun).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByType("button").props.disabled).toBe(true);

    await act(async () => {
      resolveRun?.({ run: { id: "run-1" } });
      await Promise.resolve();
    });
  });
});
