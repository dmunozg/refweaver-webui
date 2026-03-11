import { describe, expect, it } from "vitest";
import { logout } from "./logout";

describe("logout", () => {
  it("deletes session for provided token hash", async () => {
    const calls: string[] = [];
    const store = {
      async deleteSessionByTokenHash(tokenHash: string) {
        calls.push(tokenHash);
      }
    };

    await logout("hashed-token", store);
    expect(calls).toEqual(["hashed-token"]);
  });

  it("is a no-op when token hash is missing", async () => {
    const calls: string[] = [];
    const store = {
      async deleteSessionByTokenHash(tokenHash: string) {
        calls.push(tokenHash);
      }
    };

    await logout(null, store);
    expect(calls).toHaveLength(0);
  });
});
