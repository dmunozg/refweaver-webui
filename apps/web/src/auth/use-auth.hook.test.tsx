import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("./api", () => {
  class AuthClientError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
      this.name = "AuthClientError";
    }
  }

  return {
    AuthClientError,
    fetchCurrentUser: vi.fn(),
    loginRequest: vi.fn(),
    logoutRequest: vi.fn()
  };
});

import { fetchCurrentUser } from "./api";
import { useAuth } from "./use-auth";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useAuth async safety", () => {
  let renderer: TestRenderer.ReactTestRenderer | null = null;
  let latestAuth: ReturnType<typeof useAuth> | null = null;

  function Harness() {
    latestAuth = useAuth();
    return null;
  }

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer?.unmount();
      });
    }
    renderer = null;
    latestAuth = null;
    vi.resetAllMocks();
  });

  it("ignores stale refresh results when a newer refresh wins", async () => {
    const oldRefresh = createDeferred<{ user: any }>();
    const newRefresh = createDeferred<{ user: any }>();

    const fetchMock = fetchCurrentUser as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(() => oldRefresh.promise);
    fetchMock.mockImplementationOnce(() => newRefresh.promise);

    await act(async () => {
      renderer = TestRenderer.create(<Harness />);
    });

    act(() => {
      void latestAuth!.refresh();
    });

    await act(async () => {
      newRefresh.resolve({
        user: {
          id: "user-1",
          username: "new",
          email: "new@example.com",
          name: "New",
          teamId: null
        }
      });
      await Promise.resolve();
    });

    await act(async () => {
      oldRefresh.resolve({
        user: {
          id: "user-old",
          username: "old",
          email: "old@example.com",
          name: "Old",
          teamId: null
        }
      });
      await Promise.resolve();
    });

    expect(latestAuth!.state.status).toBe("authenticated");
    if (latestAuth!.state.status === "authenticated") {
      expect(latestAuth!.state.user.id).toBe("user-1");
    }
  });

  it("does not crash when unmounted before async refresh completes", async () => {
    const deferred = createDeferred<{ user: any }>();
    const fetchMock = fetchCurrentUser as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(() => deferred.promise);

    await act(async () => {
      renderer = TestRenderer.create(<Harness />);
    });

    act(() => {
      renderer?.unmount();
    });
    renderer = null;

    await act(async () => {
      deferred.resolve({
        user: {
          id: "user-1",
          username: "ada",
          email: "ada@example.com",
          name: "Ada",
          teamId: null
        }
      });
      await Promise.resolve();
    });

    expect(true).toBe(true);
  });
});
