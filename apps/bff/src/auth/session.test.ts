import { describe, expect, it } from "vitest";
import { getSessionTokenFromCookieHeader } from "./session";

describe("getSessionTokenFromCookieHeader", () => {
  it("extracts rw_session token", () => {
    const token = getSessionTokenFromCookieHeader("foo=bar; rw_session=abc123; theme=dark");
    expect(token).toBe("abc123");
  });

  it("returns null when session cookie is absent", () => {
    const token = getSessionTokenFromCookieHeader("foo=bar; theme=dark");
    expect(token).toBeNull();
  });
});
