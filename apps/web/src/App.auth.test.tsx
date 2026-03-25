import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("./auth/use-auth", () => ({
  useAuth: vi.fn()
}));

import { useAuth } from "./auth/use-auth";
import { App } from "./App";
import * as api from "./analysis/api";
import * as polling from "./analysis/polling";
import { LoginForm } from "./auth/LoginForm";
import { analysisRoutes } from "./navigation/routes";
import { installMockWindow } from "./navigation/test-window";
import * as projectModule from "./projects/use-default-project";

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockedCreateRun = vi.spyOn(api, "createRun");
const mockedGetRun = vi.spyOn(api, "getRun");
const mockedListRuns = vi.spyOn(api, "listRuns");
const mockedPollAnalysisRun = vi.spyOn(polling, "pollAnalysisRun");
const mockedUseDefaultProject = vi.spyOn(projectModule, "useDefaultProject");

afterEach(() => {
  delete (globalThis as any).window;
  vi.resetAllMocks();
});

beforeEach(() => {
  installMockWindow("/");
  mockedUseDefaultProject.mockReturnValue({ status: "ready", projectId: "project-1" });
  mockedGetRun.mockResolvedValue({
    run: {
      id: "run-1",
      projectId: "project-1",
      userId: "user-1",
      title: "Detail run",
      inputText: "hello world",
      status: "finished",
      refweaverRunId: null,
      refweaverJobId: null,
      createdAt: "2026-03-25T10:00:00.000Z",
      updatedAt: "2026-03-25T10:05:00.000Z"
    }
  } as never);
  mockedListRuns.mockResolvedValue({
    runs: [],
    pagination: { page: 1, pageSize: 10, hasNext: false, hasPrevious: false }
  });
  mockedPollAnalysisRun.mockImplementation(async (_projectId, run) => run);
  mockedCreateRun.mockResolvedValue({ run: { id: "run-1" } } as never);
});

describe("App auth shell", () => {
  function authenticatedState() {
    return {
      status: "authenticated" as const,
      user: {
        id: "user-1",
        username: "ada",
        email: "ada@example.com",
        name: "Ada",
        teamId: null
      },
      error: null
    };
  }

  it("renders authenticated shell when user is authenticated", async () => {
    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });
    const text = JSON.stringify(renderer!.toJSON());

    expect(text).toContain("Welcome");
    expect(text).toContain("Ada");
    expect(text).toContain("Log out");
  });

  it("shows analysis navigation and swaps shell content when the route changes", async () => {
    window.history.replaceState({}, "", analysisRoutes.dashboard);

    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer!.root.findByType("h1").props.children).toBe("Dashboard");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Start a new analysis");

    const newAnalysisButton = renderer!.root
      .findAllByType("button")
      .find((button: { props: { children: string } }) => button.props.children === "New analysis");

    expect(newAnalysisButton).toBeDefined();

    act(() => {
      newAnalysisButton?.props.onClick();
    });

    expect(window.location.pathname).toBe(analysisRoutes.new);
    expect(renderer!.root.findByType("h1").props.children).toBe("New analysis");

    const listButton = renderer!.root
      .findAllByType("button")
      .find((button: { props: { children: string } }) => button.props.children === "Analysis list");

    expect(listButton).toBeDefined();

    await act(async () => {
      listButton?.props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.location.pathname).toBe(analysisRoutes.list);
    expect(renderer!.root.findByType("h1").props.children).toBe("Analysis list");
  });

  it("renders the analysis detail route", async () => {
    window.history.replaceState({}, "", analysisRoutes.detail("run-1"));

    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer!.root.findByType("h1").props.children).toBe("Analysis detail");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Detail run");
  });

  it("returns to the dashboard after a new analysis is submitted successfully", async () => {
    window.history.replaceState({}, "", analysisRoutes.new);

    let resolveRun: ((value: any) => void) | undefined;
    mockedCreateRun.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRun = resolve;
        })
    );

    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer!.root.findByType("h1").props.children).toBe("New analysis");

    const titleInput = renderer!.root.findAllByType("input")[0]!;
    const textArea = renderer!.root.findByType("textarea");
    const form = renderer!.root.findByType("form");

    await act(async () => {
      titleInput.props.onChange({ target: { value: "Draft analysis" } });
    });

    await act(async () => {
      textArea.props.onChange({ target: { value: "  hello world  " } });
    });

    await act(async () => {
      void form.props.onSubmit({ preventDefault() {} });
    });

    expect(mockedCreateRun).toHaveBeenCalledWith("project-1", {
      text: "hello world",
      title: "Draft analysis"
    });
    expect(window.location.pathname).toBe(analysisRoutes.new);

    await act(async () => {
      resolveRun?.({ run: { id: "run-1" } });
      await Promise.resolve();
    });

    expect(window.location.pathname).toBe(analysisRoutes.dashboard);
    expect(renderer!.root.findByType("h1").props.children).toBe("Dashboard");
  });

  it("renders signed-out shell when session is missing", () => {
    mockedUseAuth.mockReturnValue({
      state: {
        status: "signed_out",
        user: null,
        error: null
      },
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<App />);
    });
    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Please log in");
  });

  it("prevents duplicate login submissions while request is in flight", async () => {
    let resolveLogin: (() => void) | undefined;
    const login = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );

    mockedUseAuth.mockReturnValue({
      state: {
        status: "signed_out",
        user: null,
        error: null
      },
      refresh: async () => {},
      login,
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });

    const loginForm = renderer!.root.findByType(LoginForm);

    await act(async () => {
      void loginForm.props.onLogin("ada", "safe-pass");
      void loginForm.props.onLogin("ada", "safe-pass");
    });

    expect(login).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLogin?.();
      await Promise.resolve();
    });
  });

  it("shows visible error when logout fails", async () => {
    const logout = vi.fn(async () => {
      throw new Error("server");
    });

    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      refresh: async () => {},
      login: async () => {},
      logout
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });
    const logoutButton = renderer!.root
      .findAllByType("button")
      .find((button: { props: { children: string } }) => button.props.children === "Log out");

    expect(logoutButton).toBeDefined();

    await act(async () => {
      await logoutButton?.props.onClick();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Could not log out. Please try again.");
  });

  it("prevents duplicate logout submissions while request is in flight", async () => {
    let resolveLogout: (() => void) | undefined;
    const logout = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLogout = resolve;
        })
    );

    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      refresh: async () => {},
      login: async () => {},
      logout
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });

    const logoutButton = renderer!.root
      .findAllByType("button")
      .find((button: { props: { children: string } }) => button.props.children === "Log out");

    expect(logoutButton).toBeDefined();

    await act(async () => {
      logoutButton?.props.onClick();
      logoutButton?.props.onClick();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(logoutButton?.props.disabled).toBe(true);

    await act(async () => {
      resolveLogout?.();
    });

    expect(logoutButton?.props.disabled).toBe(false);
  });
});
