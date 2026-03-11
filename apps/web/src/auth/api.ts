import { getWebConfig } from "../config";
import type { AuthUser } from "./types";

type MeResponse = {
  user: AuthUser;
};

type LoginResponse = {
  userId: string;
};

const { bffBaseUrl } = getWebConfig();

export async function fetchCurrentUser(): Promise<MeResponse> {
  const response = await fetch(`${bffBaseUrl}/auth/me`, {
    credentials: "include"
  });

  if (response.status === 401) {
    throw new Error("unauthorized");
  }

  if (!response.ok) {
    throw new Error("auth_me_failed");
  }

  return (await response.json()) as MeResponse;
}

export async function loginRequest(identifier: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${bffBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ identifier, password })
  });

  if (response.status === 401) {
    throw new Error("invalid_credentials");
  }

  if (!response.ok) {
    throw new Error("login_failed");
  }

  return (await response.json()) as LoginResponse;
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${bffBaseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
}
