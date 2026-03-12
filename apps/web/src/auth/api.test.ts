import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthClientError, fetchCurrentUser, logoutRequest } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auth api", () => {
  it("treats logout 401 as non-fatal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 401 })
    );

    await expect(logoutRequest()).resolves.toBeUndefined();
  });

  it("throws when /auth/me response shape is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ nope: true }), { status: 200 })
    );

    await expect(fetchCurrentUser()).rejects.toEqual(expect.any(AuthClientError));
  });

  it("maps malformed /auth/me JSON payloads to AuthClientError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{", { status: 200 }));

    await expect(fetchCurrentUser()).rejects.toEqual(expect.any(AuthClientError));
  });
});
