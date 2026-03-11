import { describe, expect, it } from "vitest";
import { createDb, sessions, users } from "@refweaver/db";
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
    const result = await store.withTransaction(async (txStore) => {
      const user = await txStore.createUser({
        username: "ada",
        email: "ada@example.com",
        name: "Ada",
        passwordHash: "hash",
        teamId: null
      });
      const project = await txStore.createProject({
        name: "My First Project",
        ownerUserId: user.id,
        teamId: null
      });
      const session = await txStore.createSession({
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

  it("finds user by identifier", async () => {
    const fakeDb = {
      async transaction<T>(fn: (tx: typeof fakeDb) => Promise<T>) {
        return fn(fakeDb);
      },
      insert() {
        throw new Error("not used");
      },
      select() {
        return {
          from(table: unknown) {
            return {
              where() {
                return {
                  async limit() {
                    if (table === users) {
                      return [{ id: "user-1", username: "ada" }];
                    }

                    return [];
                  }
                };
              }
            };
          }
        };
      },
      delete() {
        throw new Error("not used");
      }
    };

    const store = createSignupStore(fakeDb as never);
    const user = await store.findUserByIdentifier("ada");
    expect(user?.id).toBe("user-1");
  });

  it("finds user by id", async () => {
    const fakeDb = {
      async transaction<T>(fn: (tx: typeof fakeDb) => Promise<T>) {
        return fn(fakeDb);
      },
      insert() {
        throw new Error("not used");
      },
      select() {
        return {
          from(table: unknown) {
            return {
              where() {
                return {
                  async limit() {
                    if (table === users) {
                      return [{ id: "user-1", username: "ada" }];
                    }

                    return [];
                  }
                };
              }
            };
          }
        };
      },
      delete() {
        throw new Error("not used");
      }
    };

    const store = createSignupStore(fakeDb as never);
    const user = await store.findUserById("user-1");
    expect(user?.id).toBe("user-1");
  });

  it("finds and deletes session by token hash", async () => {
    let deleteCount = 0;

    const fakeDb = {
      async transaction<T>(fn: (tx: typeof fakeDb) => Promise<T>) {
        return fn(fakeDb);
      },
      insert() {
        throw new Error("not used");
      },
      select() {
        return {
          from(table: unknown) {
            return {
              where() {
                return {
                  async limit() {
                    if (table === sessions) {
                      return [{ id: "session-1", userId: "user-1" }];
                    }

                    return [];
                  }
                };
              }
            };
          }
        };
      },
      delete(table: unknown) {
        return {
          async where() {
            if (table === sessions) {
              deleteCount += 1;
            }
            return [];
          }
        };
      }
    };

    const store = createSignupStore(fakeDb as never);
    const session = await store.findSessionByTokenHash("hashed-token");
    await store.deleteSessionByTokenHash("hashed-token");

    expect(session?.id).toBe("session-1");
    expect(deleteCount).toBe(1);
  });

  it("uses transaction-scoped store instance", async () => {
    const calls: string[] = [];

    const txDb = {
      async transaction<T>(fn: (tx: typeof txDb) => Promise<T>) {
        return fn(txDb);
      },
      insert() {
        calls.push("tx-insert");
        return {
          values() {
            return {
              async returning() {
                return [{ id: "tx-user" }];
              }
            };
          }
        };
      },
      select() {
        return {
          from() {
            return { where() { return { async limit() { return []; } }; } };
          }
        };
      },
      delete() {
        return { async where() { return []; } };
      }
    };

    const baseDb = {
      async transaction<T>(fn: (tx: typeof txDb) => Promise<T>) {
        return fn(txDb);
      },
      insert() {
        calls.push("base-insert");
        return {
          values() {
            return {
              async returning() {
                return [{ id: "base-user" }];
              }
            };
          }
        };
      },
      select() {
        return {
          from() {
            return { where() { return { async limit() { return []; } }; } };
          }
        };
      },
      delete() {
        return { async where() { return []; } };
      }
    };

    const store = createSignupStore(baseDb as never);

    await store.withTransaction(async (txStore) => {
      await txStore.createUser({
        username: "tx",
        email: "tx@example.com",
        name: "Tx",
        passwordHash: "hash",
        teamId: null
      });
    });

    expect(calls).toEqual(["tx-insert"]);
  });
});
