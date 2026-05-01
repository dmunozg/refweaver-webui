import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Mock client module — must precede import of useAuth to guarantee correct
// module-evaluation order in all Bun versions (1.3.10 vs 1.3.11).
// ---------------------------------------------------------------------------
vi.mock("./client", () => ({
  authClient: {
    useSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn()
  }
}));

import { authClient } from "./client";
(vi as unknown as { unmock?: (path: string) => void }).unmock?.("./use-auth");
const { useAuth } = await import("./use-auth");

// ---------------------------------------------------------------------------
// Shared harness
// ---------------------------------------------------------------------------
interface AuthResult {
  state: { status: string; user: unknown; error: unknown };
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { email: string; password: string; name: string; username?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

// Mutable container so the harness can write into it without closure issues
const capture = { current: null as AuthResult | null };

function CaptureHarness() {
  const auth = useAuth();
  capture.current = auth as AuthResult;
  return null;
}

// ---------------------------------------------------------------------------
// Session factory + setter
// ---------------------------------------------------------------------------
type SessionState = {
  isPending: boolean;
  data: { user: Record<string, unknown> } | null;
  error: Error | null;
  refetch: () => void;
};

function makeSession(overrides: Partial<SessionState> & { refetch?: () => void }): SessionState {
  return { refetch: vi.fn(), ...overrides } as SessionState;
}

function setSession(session: SessionState) {
  (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue(session);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
afterEach(() => {
  capture.current = null;
  vi.clearAllMocks();
});

describe("useAuth state machine", () => {
  it("1 — loading state", () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: true, data: null, error: null, refetch }));
    act(() => { TestRenderer.create(<CaptureHarness />); });
    expect(capture.current!.state.status).toBe("loading");
    expect(capture.current!.state.user).toBe(null);
    expect(capture.current!.state.error).toBe(null);
  });

  it("2 — authenticated state with normalization", () => {
    const refetch = vi.fn();
    setSession(makeSession({
      isPending: false,
      data: {
        user: {
          id: "user-1",
          email: "ada@example.com",
          name: "Ada Lovelace",
          username: "",
          projectId: "",
          adminRole: "superadmin"
        }
      },
      error: null,
      refetch
    }));
    act(() => { TestRenderer.create(<CaptureHarness />); });
    expect(capture.current!.state.status).toBe("authenticated");
    expect(capture.current!.state.user).toMatchObject({
      id: "user-1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      username: null,
      projectId: null,
      adminRole: "user"
    });
    expect(capture.current!.state.error).toBe(null);
  });

  it("3 — error from session.error", () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: new Error("session unavailable"), refetch }));
    act(() => { TestRenderer.create(<CaptureHarness />); });
    expect(capture.current!.state.status).toBe("error");
    expect(capture.current!.state.error).toBe("session unavailable");
    expect(capture.current!.state.user).toBe(null);
  });

  it("4 — invalid session payload", () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: { user: { id: "user-1", email: "ada@example.com" } }, error: null, refetch }));
    act(() => { TestRenderer.create(<CaptureHarness />); });
    expect(capture.current!.state.status).toBe("error");
    expect(capture.current!.state.error).toBe("Invalid session payload");
    expect(capture.current!.state.user).toBe(null);
  });

  it("5 — signed_out state", () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: null, refetch }));
    act(() => { TestRenderer.create(<CaptureHarness />); });
    expect(capture.current!.state.status).toBe("signed_out");
    expect(capture.current!.state.user).toBe(null);
    expect(capture.current!.state.error).toBe(null);
  });

  it("6 — login success", async () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: null, refetch }));
    (authClient.signIn.email as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    act(() => { TestRenderer.create(<CaptureHarness />); });
    await act(async () => { await capture.current!.login("ada@example.com", "safe-pass"); });
    expect(authClient.signIn.email).toHaveBeenCalledTimes(1);
    expect(authClient.signIn.email).toHaveBeenCalledWith({ email: "ada@example.com", password: "safe-pass" });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("7 — login failure", async () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: null, refetch }));
    (authClient.signIn.email as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error("bad creds") });
    act(() => { TestRenderer.create(<CaptureHarness />); });
    await act(async () => {
      await expect(capture.current!.login("ada@example.com", "wrong")).rejects.toThrow("bad creds");
    });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("8 — signup success with username", async () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: null, refetch }));
    (authClient.signUp.email as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    act(() => { TestRenderer.create(<CaptureHarness />); });
    await act(async () => {
      await capture.current!.signup({ email: "ada@example.com", password: "safe-pass", name: "Ada Lovelace", username: "ada" });
    });
    expect(authClient.signUp.email).toHaveBeenCalledTimes(1);
    expect(authClient.signUp.email).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "safe-pass",
      name: "Ada Lovelace",
      username: "ada"
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("9 — signup success without username", async () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: null, refetch }));
    (authClient.signUp.email as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    act(() => { TestRenderer.create(<CaptureHarness />); });
    await act(async () => {
      await capture.current!.signup({ email: "ada@example.com", password: "safe-pass", name: "Ada Lovelace" });
    });
    expect(authClient.signUp.email).toHaveBeenCalledTimes(1);
    const callArg = (authClient.signUp.email as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg).not.toHaveProperty("username");
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("10 — signup failure", async () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: null, refetch }));
    (authClient.signUp.email as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error("email taken") });
    act(() => { TestRenderer.create(<CaptureHarness />); });
    await act(async () => {
      await expect(capture.current!.signup({ email: "ada@example.com", password: "safe-pass", name: "Ada Lovelace" }))
        .rejects.toThrow("email taken");
    });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("11 — logout success", async () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: null, refetch }));
    (authClient.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    act(() => { TestRenderer.create(<CaptureHarness />); });
    await act(async () => { await capture.current!.logout(); });
    expect(authClient.signOut).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("12 — logout failure", async () => {
    const refetch = vi.fn();
    setSession(makeSession({ isPending: false, data: null, error: null, refetch }));
    (authClient.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error("signout failed") });
    act(() => { TestRenderer.create(<CaptureHarness />); });
    await act(async () => {
      await expect(capture.current!.logout()).rejects.toThrow("signout failed");
    });
    expect(refetch).not.toHaveBeenCalled();
  });
});
