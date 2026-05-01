import { describe, expect, it } from "vitest";
import { getUserDisplayName } from "./display-name";

describe("getUserDisplayName", () => {
  it("prefers username, then name, then email local-part", () => {
    expect(
      getUserDisplayName({
        id: "user-1",
        username: "ada",
        email: "ada@example.com",
        name: "Ada Lovelace",
        adminRole: "admin",
        projectId: null
      })
    ).toBe("ada");

    expect(
      getUserDisplayName({
        id: "user-1",
        username: null,
        email: "ada@example.com",
        name: "Ada Lovelace",
        adminRole: "admin",
        projectId: null
      })
    ).toBe("Ada Lovelace");

    expect(
      getUserDisplayName({
        id: "user-1",
        username: "",
        email: "ada@example.com",
        name: "",
        adminRole: "admin",
        projectId: null
      })
    ).toBe("ada");
  });
});
