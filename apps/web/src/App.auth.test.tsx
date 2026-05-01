import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("./auth/client", () => ({
  authClient: {
    useSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn()
  }
}));

import { authClient } from "./auth/client";
import { App } from "./App";
import { LoginForm } from "./auth/LoginForm";

type SessionState = {
  isPending: boolean;
  data: { user: Record<string, unknown> } | null;
  error: Error | null;
  refetch: () => Promise<void>;
};

function makeSession(overrides: Partial<SessionState>): SessionState {
  return {
    isPending: false,
    data: null,
    error: null,
    refetch: async () => {},
    ...overrides
  };
}

function setSession(session: SessionState) {
  (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue(session);
}

function authenticatedUser() {
  return {
    id: "user-1",
    username: "ada",
    email: "ada@example.com",
    name: "Ada",
    adminRole: "admin",
    projectId: "project-1"
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("App auth flows", () => {
  it("unauthenticated user sees login/signup shell", () => {
    setSession(makeSession({ data: null }));

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<App />);
    });
    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Please log in");
  });

  it("authenticated user sees main app shell", () => {
    setSession(makeSession({ data: { user: authenticatedUser() } }));

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
    const session = makeSession({ data: { user: authenticatedUser() } });
    (authClient.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    session.refetch = vi.fn(async () => {
      session.data = null;
    });
    setSession(session);

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });

    const textBefore = JSON.stringify(renderer!.toJSON());
    expect(textBefore).toContain("Welcome");

    const logoutButton = renderer!.root.findByType("button");
    await act(async () => {
      await logoutButton.props.onClick();
    });

    await act(async () => {
      renderer!.update(<App />);
    });

    const textAfter = JSON.stringify(renderer!.toJSON());
    expect(textAfter).toContain("Please log in");
    expect(textAfter).not.toContain("Welcome");
  });
});

describe("App auth shell", () => {
  it("renders authenticated shell when user is authenticated", () => {
    setSession(makeSession({ data: { user: authenticatedUser() } }));

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
    setSession(makeSession({ data: null }));

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<App />);
    });
    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Please log in");
  });

  it("prevents duplicate login submissions while request is in flight", async () => {
    let resolveLogin: (() => void) | undefined;
    (authClient.signIn.email as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = () => resolve({ error: null });
        })
    );
    const refetch = vi.fn(async () => {});
    setSession(makeSession({ data: null, refetch }));

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });

    const loginForm = renderer!.root.findByType(LoginForm);

    await act(async () => {
      void loginForm.props.onLogin("ada", "safe-pass");
      void loginForm.props.onLogin("ada", "safe-pass");
    });

    expect(authClient.signIn.email).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLogin?.();
      await Promise.resolve();
    });
  });

  it("shows visible error when logout fails", async () => {
    (authClient.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: new Error("server")
    });
    setSession(makeSession({ data: { user: authenticatedUser() } }));

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });
    const logoutButton = renderer!.root.findByType("button");

    await act(async () => {
      await logoutButton.props.onClick();
    });

    expect(authClient.signOut).toHaveBeenCalledTimes(1);
    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Could not log out. Please try again.");
  });

  it("prevents duplicate logout submissions while request is in flight", async () => {
    let resolveLogout: (() => void) | undefined;
    (authClient.signOut as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogout = () => resolve({ error: null });
        })
    );
    setSession(makeSession({ data: { user: authenticatedUser() } }));

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<App />);
    });

    const logoutButton = renderer!.root.findByType("button");

    await act(async () => {
      logoutButton.props.onClick();
      logoutButton.props.onClick();
    });

    expect(authClient.signOut).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findByType("button").props.disabled).toBe(true);

    await act(async () => {
      resolveLogout?.();
      await Promise.resolve();
    });

    expect(renderer!.root.findByType("button").props.disabled).toBe(false);
  });
});
