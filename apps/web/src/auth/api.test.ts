import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthClientError, fetchCurrentUser, loginRequest, logoutRequest } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auth api", () => {
  it("fetchCurrentUser returns user for valid payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "user-1",
            username: "ada",
            email: "ada@example.com",
            name: "Ada",
            teamId: null
          }
        }),
        { status: 200 }
      )
    );

    const result = await fetchCurrentUser();
    expect(result.user.id).toBe("user-1");
  });

  it("fetchCurrentUser maps 401 to unauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));

    await expect(fetchCurrentUser()).rejects.toMatchObject<AuthClientError>({
      code: "unauthorized"
    });
  });

  it("fetchCurrentUser maps non-2xx to server_error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(fetchCurrentUser()).rejects.toMatchObject<AuthClientError>({
      code: "server_error"
    });
  });

  it("fetchCurrentUser maps network failures to network_error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    await expect(fetchCurrentUser()).rejects.toMatchObject<AuthClientError>({
      code: "network_error"
    });
  });

  it("throws when /auth/me response shape is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ nope: true }), { status: 200 })
    );

    await expect(fetchCurrentUser()).rejects.toMatchObject<AuthClientError>({
      code: "unknown"
    });
  });

  it("maps malformed /auth/me JSON payloads to AuthClientError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{", { status: 200 }));

    await expect(fetchCurrentUser()).rejects.toMatchObject<AuthClientError>({
      code: "unknown"
    });
  });

  it("loginRequest returns user id for valid payload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ userId: "user-1" }), { status: 200 })
    );

    const result = await loginRequest("ada", "safe-pass");

    expect(result.userId).toBe("user-1");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      })
    );
  });

  it("loginRequest sends credentials payload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ userId: "user-1" }), { status: 200 })
    );

    await loginRequest("ada", "safe-pass");

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.body).toBe(JSON.stringify({ identifier: "ada", password: "safe-pass" }));
  });

  it("loginRequest maps 401 to invalid_credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));

    await expect(loginRequest("ada", "wrong-pass")).rejects.toMatchObject<AuthClientError>({
      code: "invalid_credentials"
    });
  });

  it("loginRequest maps non-2xx to server_error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(loginRequest("ada", "safe-pass")).rejects.toMatchObject<AuthClientError>({
      code: "server_error"
    });
  });

  it("loginRequest maps network failures to network_error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    await expect(loginRequest("ada", "safe-pass")).rejects.toMatchObject<AuthClientError>({
      code: "network_error"
    });
  });

  it("loginRequest maps malformed JSON to unknown", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{", { status: 200 }));

    await expect(loginRequest("ada", "safe-pass")).rejects.toMatchObject<AuthClientError>({
      code: "unknown"
    });
  });

  it("loginRequest maps invalid JSON shape to unknown", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ nope: true }), { status: 200 })
    );

    await expect(loginRequest("ada", "safe-pass")).rejects.toMatchObject<AuthClientError>({
      code: "unknown"
    });
  });

  it("logoutRequest treats 401 as non-fatal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));

    await expect(logoutRequest()).resolves.toBeUndefined();
  });

  it("logoutRequest maps non-2xx to server_error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(logoutRequest()).rejects.toMatchObject<AuthClientError>({
      code: "server_error"
    });
  });

  it("logoutRequest maps network failures to network_error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    await expect(logoutRequest()).rejects.toMatchObject<AuthClientError>({
      code: "network_error"
    });
  });

  it("logoutRequest sends include credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await logoutRequest();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });
});
