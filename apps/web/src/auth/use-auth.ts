import { useMemo } from "react";
import { authClient } from "./client";
import type { AuthState, AuthUser } from "./types";

function normalizeUser(input: Record<string, unknown>): AuthUser {
  const user = input as Record<string, unknown>;
  return {
    id: String(user.id),
    username: typeof user.username === "string" ? user.username : null,
    email: String(user.email),
    name: typeof user.name === "string" ? user.name : "",
    adminRole: user.adminRole === "admin" ? "admin" : "user",
    projectId: typeof user.projectId === "string" ? user.projectId : null,
    teamId: typeof user.teamId === "string" ? user.teamId : null
  };
}

export function useAuth() {
  const session = authClient.useSession();

  const state = useMemo<AuthState>(() => {
    if (session.isPending) {
      return { status: "loading", user: null, error: null };
    }

    if (session.error) {
      return { status: "error", user: null, error: session.error.message };
    }

    if (session.data?.user) {
      return { status: "authenticated", user: normalizeUser(session.data.user), error: null };
    }

    return { status: "signed_out", user: null, error: null };
  }, [session.data, session.error, session.isPending]);

  async function login(email: string, password: string) {
    const result = await authClient.signIn.email({
      email,
      password
    });

    if (result.error) {
      throw result.error;
    }

    await session.refetch();
  }

  async function signup(input: { email: string; password: string; name: string; username?: string }) {
    const result = await authClient.signUp.email({
      email: input.email,
      password: input.password,
      name: input.name,
      ...(input.username ? { username: input.username } : {})
    });

    if (result.error) {
      throw result.error;
    }

    await session.refetch();
  }

  async function logout() {
    await authClient.signOut();
    await session.refetch();
  }

  return {
    state,
    login,
    signup,
    logout
  };
}
