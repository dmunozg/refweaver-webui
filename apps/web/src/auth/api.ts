import { getWebConfig } from "../config";
import type { AuthUser } from "./types";

export type AuthErrorCode =
  | "unauthorized"
  | "invalid_credentials"
  | "server_error"
  | "network_error"
  | "unknown";

export class AuthClientError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthClientError";
  }
}

type MeResponse = {
  user: AuthUser;
};

type LoginResponse = {
  userId: string;
};

const { bffBaseUrl } = getWebConfig();

export async function fetchCurrentUser(): Promise<MeResponse> {
  let response: Response;
  try {
    response = await fetch(`${bffBaseUrl}/auth/me`, {
      credentials: "include"
    });
  } catch {
    throw new AuthClientError("network_error");
  }

  if (response.status === 401) {
    throw new AuthClientError("unauthorized");
  }

  if (!response.ok) {
    throw new AuthClientError("server_error");
  }

  return (await response.json()) as MeResponse;
}

export async function loginRequest(identifier: string, password: string): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${bffBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password })
    });
  } catch {
    throw new AuthClientError("network_error");
  }

  if (response.status === 401) {
    throw new AuthClientError("invalid_credentials");
  }

  if (!response.ok) {
    throw new AuthClientError("server_error");
  }

  return (await response.json()) as LoginResponse;
}

export async function logoutRequest(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${bffBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch {
    throw new AuthClientError("network_error");
  }

  if (!response.ok) {
    throw new AuthClientError("server_error");
  }
}
