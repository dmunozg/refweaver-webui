import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("./auth/use-auth", () => ({
  useAuth: vi.fn()
}));

import { useAuth } from "./auth/use-auth";
import { App } from "./App";
import { LoginForm } from "./auth/LoginForm";
import { analysisRoutes } from "./navigation/routes";

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

function createMockWindow(pathname: string) {
  const listeners = new Set<() => void>();
  const location = { pathname };

  return {
    location,
    history: {
      pushState: (_state: unknown, _title: string, nextPathname?: string) => {
        if (nextPathname) {
          location.pathname = nextPathname;
        }
      },
      replaceState: (_state: unknown, _title: string, nextPathname?: string) => {
        if (nextPathname) {
          location.pathname = nextPathname;
        }
      }
    },
    addEventListener: (type: string, listener: () => void) => {
      if (type === "popstate") {
        listeners.add(listener);
      }
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === "popstate") {
        listeners.delete(listener);
      }
    },
    dispatchEvent: (event: { type: string }) => {
      if (event.type === "popstate") {
        listeners.forEach((listener) => listener());
      }

      return true;
    }
  };
}

let mockWindow: ReturnType<typeof createMockWindow>;

afterEach(() => {
  delete (globalThis as any).window;
  vi.resetAllMocks();
});

beforeEach(() => {
  mockWindow = createMockWindow("/");
  (globalThis as any).window = mockWindow;
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

  it("renders authenticated shell when user is authenticated", () => {
    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<App />);
    });
    const text = JSON.stringify(renderer!.toJSON());

    expect(text).toContain("Welcome");
    expect(text).toContain("Ada");
    expect(text).toContain("Log out");
  });

  it("shows analysis navigation and swaps shell content when the route changes", () => {
    window.history.replaceState({}, "", analysisRoutes.dashboard);

    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<App />);
    });

    expect(renderer!.root.findByType("h1").props.children).toBe("Dashboard");

    const newAnalysisButton = renderer!.root
      .findAllByType("button")
      .find((button: { props: { children: string } }) => button.props.children === "New analysis");

    expect(newAnalysisButton).toBeDefined();

    act(() => {
      newAnalysisButton?.props.onClick();
    });

    expect(window.location.pathname).toBe(analysisRoutes.new);
    expect(renderer!.root.findByType("h1").props.children).toBe("New analysis");
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
