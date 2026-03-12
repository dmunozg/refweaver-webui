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

// Runtime guard for the user object returned by /auth/me.
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

// Validates the /auth/me payload and normalizes invalid shapes to typed auth errors.
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

// Validates the /auth/login payload and normalizes invalid shapes to typed auth errors.
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
    // Include cookies so the backend can resolve the current session.
    response = await fetch(`${bffBaseUrl}/auth/me`, {
      credentials: "include"
    });
  } catch {
    // Network-layer failures never reached the backend.
    throw new AuthClientError("network_error");
  }

  // 401 means there is no valid session (not a generic server failure).
  if (response.status === 401) {
    throw new AuthClientError("unauthorized");
  }

  // Any other non-2xx is treated as backend/server failure.
  if (!response.ok) {
    throw new AuthClientError("server_error");
  }

  // Parse and validate payload shape before returning typed data.
  try {
    const body = await response.json();
    return parseMeResponse(body);
  } catch (error) {
    if (error instanceof AuthClientError) {
      throw error;
    }

    throw new AuthClientError("unknown");
  }
}

export async function loginRequest(identifier: string, password: string): Promise<LoginResponse> {
  let response: Response;
  try {
    // Send credentials and include cookies so session cookie can be set.
    response = await fetch(`${bffBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password })
    });
  } catch {
    // Request did not complete due to network-level failure.
    throw new AuthClientError("network_error");
  }

  // 401 on login is a credential failure by contract.
  if (response.status === 401) {
    throw new AuthClientError("invalid_credentials");
  }

  // Any other non-2xx is treated as backend/server failure.
  if (!response.ok) {
    throw new AuthClientError("server_error");
  }

  // Parse and validate payload shape before returning typed data.
  try {
    const body = await response.json();
    return parseLoginResponse(body);
  } catch (error) {
    if (error instanceof AuthClientError) {
      throw error;
    }

    throw new AuthClientError("unknown");
  }
}

export async function logoutRequest(): Promise<void> {
  let response: Response;
  try {
    // Logout is cookie-based, so credentials must be included.
    response = await fetch(`${bffBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch {
    // Network-layer failures never reached the backend.
    throw new AuthClientError("network_error");
  }

  // 401 is treated as already-signed-out and therefore non-fatal.
  if (response.status === 401) {
    return;
  }

  // Remaining non-2xx statuses are backend/server failures.
  if (!response.ok) {
    throw new AuthClientError("server_error");
  }
}
