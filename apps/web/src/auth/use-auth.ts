import { useEffect, useRef, useState } from "react";
import { AuthClientError, fetchCurrentUser, loginRequest, logoutRequest } from "./api";
import type { AuthState, AuthUser } from "./types";

export const INITIAL_AUTH_STATE: AuthState = {
  status: "loading",
  user: null,
  error: null
};

type BootstrapFetcher = () => Promise<{ user: AuthUser }>;

export async function bootstrapAuthState(fetcher: BootstrapFetcher): Promise<AuthState> {
  try {
    const result = await fetcher();
    return {
      status: "authenticated",
      user: result.user,
      error: null
    };
  } catch (error) {
    if (error instanceof AuthClientError && error.code === "unauthorized") {
      return {
        status: "signed_out",
        user: null,
        error: null
      };
    }

    return {
      status: "error",
      user: null,
      error: "Could not load session"
    };
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const isMountedRef = useRef(true);
  const requestCounterRef = useRef(0);

  async function runLatest(task: () => Promise<AuthState>) {
    requestCounterRef.current += 1;
    const requestId = requestCounterRef.current;
    const nextState = await task();

    if (!isMountedRef.current) {
      return;
    }

    if (requestCounterRef.current !== requestId) {
      return;
    }

    setState(nextState);
  }

  async function refresh() {
    if (isMountedRef.current) {
      setState({ status: "loading", user: null, error: null });
    }

    await runLatest(() => bootstrapAuthState(fetchCurrentUser));
  }

  async function login(identifier: string, password: string) {
    await loginRequest(identifier, password);
    await runLatest(() => bootstrapAuthState(fetchCurrentUser));
  }

  async function logout() {
    await logoutRequest();
    if (isMountedRef.current) {
      requestCounterRef.current += 1;
      setState({ status: "signed_out", user: null, error: null });
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    void refresh();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    state,
    refresh,
    login,
    logout
  };
}
