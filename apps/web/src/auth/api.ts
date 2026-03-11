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

function isAuthUser(input: unknown): input is AuthUser {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.username === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.name === "string" &&
    (typeof candidate.teamId === "string" || candidate.teamId === null)
  );
}

function parseMeResponse(input: unknown): MeResponse {
  if (!input || typeof input !== "object") {
    throw new AuthClientError("unknown");
  }

  const body = input as Record<string, unknown>;
  if (!isAuthUser(body.user)) {
    throw new AuthClientError("unknown");
  }

  return { user: body.user };
}

function parseLoginResponse(input: unknown): LoginResponse {
  if (!input || typeof input !== "object") {
    throw new AuthClientError("unknown");
  }

  const body = input as Record<string, unknown>;
  if (typeof body.userId !== "string") {
    throw new AuthClientError("unknown");
  }

  return { userId: body.userId };
}

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

  const body = await response.json();
  return parseMeResponse(body);
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

  const body = await response.json();
  return parseLoginResponse(body);
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

  if (response.status === 401) {
    return;
  }

  if (!response.ok) {
    throw new AuthClientError("server_error");
  }
}
