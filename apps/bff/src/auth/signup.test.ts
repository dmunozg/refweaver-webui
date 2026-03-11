import { describe, expect, it } from "vitest";
import { signup } from "./signup";

describe("signup", () => {
  it("creates user and default personal project", async () => {
    const created = {
      user: null as null | { id: string },
      project: null as null | { id: string; name: string; ownerUserId: string; teamId: string | null },
      session: null as null | { id: string; userId: string; expiresAt: Date }
    };

    const db = {
      async withTransaction<T>(fn: (store: typeof db) => Promise<T>) {
        return fn(db);
      },
      createUser: async () => {
        created.user = { id: "user-1" };
        return { id: "user-1" };
      },
      createProject: async (input: {
        name: string;
        ownerUserId: string;
        teamId: string | null;
      }) => {
        created.project = { id: "project-1", ...input };
        return created.project;
      },
      createSession: async (input: { userId: string; expiresAt: Date }) => {
        created.session = { id: "session-1", ...input };
        return created.session;
      }
    };

    await signup(
      {
        username: "ada",
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "safe-pass"
      },
      db
    );

    expect(created.user?.id).toBe("user-1");
    expect(created.project?.name).toBe("My First Project");
    expect(created.project?.ownerUserId).toBe("user-1");
    expect(created.project?.teamId).toBeNull();
    expect(created.session?.userId).toBe("user-1");
  });

  it("runs writes inside a transaction boundary", async () => {
    let transactionRuns = 0;
    const writes: string[] = [];

    const store = {
      async withTransaction<T>(fn: (txStore: typeof store) => Promise<T>) {
        transactionRuns += 1;
        return fn(store);
      },
      async createUser() {
        writes.push("user");
        return { id: "user-1" };
      },
      async createProject() {
        writes.push("project");
        return { id: "project-1" };
      },
      async createSession() {
        writes.push("session");
        return { id: "session-1" };
      }
    };

    await signup(
      {
        username: "ada",
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "safe-pass"
      },
      store
    );

    expect(transactionRuns).toBe(1);
    expect(writes).toEqual(["user", "project", "session"]);
  });
});
