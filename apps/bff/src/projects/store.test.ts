import { describe, expect, it } from "vitest";
import { createProjectStore } from "./store";

describe("project store", () => {
  it("creates project row with owner fields", async () => {
    const inserted: Record<string, unknown>[] = [];
    const db = {
      insert() {
        return {
          values(values: Record<string, unknown>) {
            inserted.push(values);
            return {
              async returning() {
                return [
                  {
                    id: "project-1",
                    name: values.name,
                    ownerUserId: values.ownerUserId,
                    teamId: null,
                    deletedAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }
                ];
              }
            };
          }
        };
      },
      select() {
        throw new Error("not used");
      },
      update() {
        throw new Error("not used");
      }
    };

    const store = createProjectStore(db as never);
    const created = await store.createProject({ ownerUserId: "user-1", name: "Project A" });

    expect(created.id).toBe("project-1");
    expect(inserted[0]?.ownerUserId).toBe("user-1");
    expect(inserted[0]?.name).toBe("Project A");
  });

  it("lists projects and gets project by id", async () => {
    const rows = [
      {
        id: "project-1",
        name: "Project A",
        ownerUserId: "user-1",
        teamId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    let whereCalls = 0;
    const db = {
      insert() {
        throw new Error("not used");
      },
      select() {
        return {
          from() {
            return {
              where() {
                whereCalls += 1;
                return {
                  async orderBy() {
                    return rows;
                  },
                  async limit() {
                    return rows;
                  }
                };
              }
            };
          }
        };
      },
      update() {
        throw new Error("not used");
      }
    };

    const store = createProjectStore(db as never);
    const listed = await store.listProjects("user-1", false);
    const fetched = await store.getProjectById("user-1", "project-1", true);

    expect(whereCalls).toBe(2);
    expect(listed).toHaveLength(1);
    expect(fetched?.id).toBe("project-1");
  });

  it("updates, soft-deletes, and restores project", async () => {
    const sets: Array<Record<string, unknown>> = [];
    let current = {
      id: "project-1",
      name: "Project A",
      ownerUserId: "user-1",
      teamId: null,
      deletedAt: null as Date | null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const db = {
      insert() {
        throw new Error("not used");
      },
      select() {
        throw new Error("not used");
      },
      update() {
        return {
          set(values: Record<string, unknown>) {
            sets.push(values);
            current = { ...current, ...values };
            return {
              where() {
                return {
                  async returning() {
                    return [current];
                  }
                };
              }
            };
          }
        };
      }
    };

    const store = createProjectStore(db as never);
    const renamed = await store.updateProjectName("user-1", "project-1", "Renamed");
    const archived = await store.softDeleteProject("user-1", "project-1");
    const restored = await store.restoreProject("user-1", "project-1");

    expect(renamed?.name).toBe("Renamed");
    expect(archived?.deletedAt).toBeInstanceOf(Date);
    expect(restored?.deletedAt).toBeNull();
    expect(sets).toHaveLength(3);
  });
});
