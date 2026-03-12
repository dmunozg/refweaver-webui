import { useEffect, useRef, useState } from "react";
import { AuthClientError, fetchCurrentUser, loginRequest, logoutRequest } from "./api";
import type { AuthState, AuthUser } from "./types";

export const INITIAL_AUTH_STATE: AuthState = {
  // Start in loading so the app can verify an existing cookie session.
  status: "loading",
  user: null,
  error: null
};

type BootstrapFetcher = () => Promise<{ user: AuthUser }>;

export async function bootstrapAuthState(fetcher: BootstrapFetcher): Promise<AuthState> {
  try {
    // If /auth/me succeeds, we can hydrate authenticated UI state.
    const result = await fetcher();
    return {
      status: "authenticated",
      user: result.user,
      error: null
    };
  } catch (error) {
    // Unauthorized means there is no valid session, not a hard app error.
    if (error instanceof AuthClientError && error.code === "unauthorized") {
      return {
        status: "signed_out",
        user: null,
        error: null
      };
    }

    if (error instanceof AuthClientError && error.code === "network_error") {
      return {
        status: "error",
        user: null,
        error: "Network error while checking session"
      };
    }

    if (error instanceof AuthClientError && error.code === "server_error") {
      return {
        status: "error",
        user: null,
        error: "Server error while checking session"
      };
    }

    if (error instanceof AuthClientError && error.code === "unknown") {
      return {
        status: "error",
        user: null,
        error: "Unexpected session response"
      };
    }

    // Anything else is treated as an operational failure while checking session.
    return {
      status: "error",
      user: null,
      error: "Unexpected error while checking session"
    };
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);
  // Avoid setting state after component unmounts.
  const isMountedRef = useRef(true);
  // Sequence guard: only the latest auth request can update state.
  const requestCounterRef = useRef(0);

  async function runLatest(task: () => Promise<AuthState>) {
    // Capture this invocation order before awaiting network work.
    requestCounterRef.current += 1;
    const requestId = requestCounterRef.current;
    const nextState = await task();

    // Drop stale results if component is gone.
    if (!isMountedRef.current) {
      return;
    }

    // Drop stale results if a newer request started after this one.
    if (requestCounterRef.current !== requestId) {
      return;
    }

    // Safe to apply latest resolved auth state.
    setState(nextState);
  }

  async function refresh() {
    // Show loading while we re-check session status.
    if (isMountedRef.current) {
      setState({ status: "loading", user: null, error: null });
    }

    // Bootstrap from /auth/me using the latest-request guard.
    await runLatest(() => bootstrapAuthState(fetchCurrentUser));
  }

  async function login(identifier: string, password: string) {
    // Create/update server session, then re-hydrate user state from /auth/me.
    await loginRequest(identifier, password);
    await runLatest(() => bootstrapAuthState(fetchCurrentUser));
  }

  async function logout() {
    // Invalidate server session first.
    await logoutRequest();
    if (isMountedRef.current) {
      // Invalidate any in-flight refresh/login completion that may arrive later.
      requestCounterRef.current += 1;
      // Immediately move UI to signed-out state.
      setState({ status: "signed_out", user: null, error: null });
    }
  }

  useEffect(() => {
    // Mark mounted and perform initial session bootstrap once.
    isMountedRef.current = true;
    void refresh();

    return () => {
      // Prevent async completions from mutating state after unmount.
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
