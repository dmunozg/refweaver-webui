import { describe, expect, it } from "vitest";
import { createDb } from "@refweaver/db";
import { createSignupStore } from "./store";

describe("db exports", () => {
  it("exports createDb runtime factory", () => {
    expect(createDb).toBeTypeOf("function");
  });
});

describe("createSignupStore", () => {
  it("creates user, project, and session rows", async () => {
    const inserted: Array<{ table: unknown; values: unknown }> = [];

    const fakeDb = {
      async transaction<T>(fn: (tx: typeof fakeDb) => Promise<T>) {
        return fn(fakeDb);
      },
      insert(table: unknown) {
        return {
          values(values: unknown) {
            inserted.push({ table, values });
            return {
              returning() {
                return Promise.resolve([{ id: `id-${inserted.length}` }]);
              }
            };
          }
        };
      }
    };

    const store = createSignupStore(fakeDb as never);
    const result = await store.withTransaction(async () => {
      const user = await store.createUser({
        username: "ada",
        email: "ada@example.com",
        name: "Ada",
        passwordHash: "hash",
        teamId: null
      });
      const project = await store.createProject({
        name: "My First Project",
        ownerUserId: user.id,
        teamId: null
      });
      const session = await store.createSession({
        userId: user.id,
        sessionTokenHash: "token-hash",
        expiresAt: new Date()
      });

      return { user, project, session };
    });

    expect(result.user.id).toBe("id-1");
    expect(result.project.id).toBe("id-2");
    expect(result.session.id).toBe("id-3");
    expect(inserted).toHaveLength(3);
  });
});
