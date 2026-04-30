import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("./auth/use-auth", () => ({
  useAuth: vi.fn()
}));

import { useAuth } from "./auth/use-auth";
import { App } from "./App";
import { LoginForm } from "./auth/LoginForm";

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

function authenticatedState() {
  return {
    status: "authenticated" as const,
    user: {
      id: "user-1",
      username: "ada",
      email: "ada@example.com",
      name: "Ada",
      adminRole: "admin",
      projectId: "project-1"
    },
    error: null
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("App auth flows", () => {
  it("unauthenticated user sees login/signup shell", () => {
    mockedUseAuth.mockReturnValue({
      state: {
        status: "signed_out",
        user: null,
        error: null
      },
      login: async () => {},
      signup: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<App />);
    });
    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Please log in");
  });

  it("authenticated user sees main app shell", () => {
    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      login: async () => {},
      signup: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<App />);
    });
    const text = JSON.stringify(renderer!.toJSON());

    expect(text).toContain("Welcome");
    expect(text).toContain("ada");
    expect(text).toContain("Log out");
  });

  it("logout redirects to login shell", async () => {
    // In-place mutable state: mutating fields after logout simulates what happens
    // when authClient.useSession() delivers a new session after signOut+refetch.
    // The same mock object is returned on every call; we mutate it in-place so
    // the next render sees the updated status.
    const mockState = {
      state: { ...authenticatedState() },
      login: async () => {},
      signup: async () => {},
      logout: async () => {
        // Mutate in-place so React's equality check sees a different value
        mockState.state.status = "signed_out";
        mockState.state.user = null;
        mockState.state.error = null;
      }
    };

    mockedUseAuth.mockReturnValue(mockState);

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });

    // Confirm authenticated shell is showing
    const textBefore = JSON.stringify(renderer!.toJSON());
    expect(textBefore).toContain("Welcome");
    expect(textBefore).toContain("Log out");

    // Trigger logout button click
    const logoutButton = renderer!.root.findByType("button");
    await act(async () => {
      await logoutButton.props.onClick();
    });

    // Force a re-render so the mutated mock state is picked up.
    // Without this, React has no signal that the mock return value changed.
    await act(async () => {
      renderer!.update(<App />);
    });

    // After logout: UI should transition to login shell
    const textAfter = JSON.stringify(renderer!.toJSON());
    expect(textAfter).toContain("Please log in");
    expect(textAfter).not.toContain("Welcome");
  });
});

describe("App auth shell", () => {
  it("renders authenticated shell when user is authenticated", () => {
    mockedUseAuth.mockReturnValue({
      state: authenticatedState(),
      login: async () => {},
      signup: async () => {},
      logout: async () => {}
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<App />);
    });
    const text = JSON.stringify(renderer!.toJSON());

    expect(text).toContain("Welcome");
    expect(text).toContain("ada");
    expect(text).toContain("Log out");
  });

  it("renders signed-out shell when session is missing", () => {
    mockedUseAuth.mockReturnValue({
      state: {
        status: "signed_out",
        user: null,
        error: null
      },
      login: async () => {},
      signup: async () => {},
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
      login,
      signup: async () => {},
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
      login: async () => {},
      signup: async () => {},
      logout
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });
    const logoutButton = renderer!.root.findByType("button");

    await act(async () => {
      await logoutButton.props.onClick();
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
      login: async () => {},
      signup: async () => {},
      logout
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });

    const logoutButton = renderer!.root.findByType("button");

    await act(async () => {
      logoutButton.props.onClick();
      logoutButton.props.onClick();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findByType("button").props.disabled).toBe(true);

    await act(async () => {
      resolveLogout?.();
    });

    expect(renderer!.root.findByType("button").props.disabled).toBe(false);
  });
});
