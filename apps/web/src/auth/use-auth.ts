import { useEffect, useState } from "react";
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

  async function refresh() {
    setState({ status: "loading", user: null, error: null });
    const nextState = await bootstrapAuthState(fetchCurrentUser);
    setState(nextState);
  }

  async function login(identifier: string, password: string) {
    await loginRequest(identifier, password);
    const nextState = await bootstrapAuthState(fetchCurrentUser);
    setState(nextState);
  }

  async function logout() {
    await logoutRequest();
    setState({ status: "signed_out", user: null, error: null });
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    state,
    refresh,
    login,
    logout
  };
}
