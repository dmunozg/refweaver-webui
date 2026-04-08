import { useMemo } from "react";
import { authClient } from "./client";
import type { AuthState, AuthUser } from "./types";

function normalizeUser(input: unknown): AuthUser | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const user = input as Record<string, unknown>;
  if (typeof user.id !== "string" || typeof user.email !== "string" || typeof user.name !== "string") {
    return null;
  }

  const adminRole = user.adminRole === "admin" ? "admin" : "user";
  return {
    id: user.id,
    username: typeof user.username === "string" && user.username.trim().length > 0 ? user.username : null,
    email: user.email,
    name: user.name,
    adminRole,
    projectId: typeof user.projectId === "string" && user.projectId.trim().length > 0 ? user.projectId : null
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
      const normalizedUser = normalizeUser(session.data.user);
      if (!normalizedUser) {
        return { status: "error", user: null, error: "Invalid session payload" };
      }

      return { status: "authenticated", user: normalizedUser, error: null };
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
    const result = await authClient.signOut();
    if (result.error) {
      throw result.error;
    }

    await session.refetch();
  }

  return {
    state,
    login,
    signup,
    logout
  };
}
