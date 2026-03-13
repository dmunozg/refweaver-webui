import { describe, expect, it } from "vitest";
import { createRunStore } from "./store";

describe("run store", () => {
  it("creates run and lists scoped history", async () => {
    const inserted: Record<string, unknown>[] = [];
    const rows = [
      {
        id: "run-1",
        projectId: "project-1",
        userId: "user-1",
        inputText: "hello",
        status: "queued",
        refweaverRunId: "up-run-1",
        refweaverJobId: "job-1",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const db = {
      insert() {
        return {
          values(values: Record<string, unknown>) {
            inserted.push(values);
            return {
              async returning() {
                return rows;
              }
            };
          }
        };
      },
      select() {
        return {
          from() {
            return {
              where() {
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

    const store = createRunStore(db as never);
    const created = await store.createRun({
      projectId: "project-1",
      userId: "user-1",
      text: "hello",
      status: "queued",
      refweaverRunId: "up-run-1",
      refweaverJobId: "job-1"
    });
    const listed = await store.listRuns("user-1", "project-1");

    expect(created.id).toBe("run-1");
    expect(listed).toHaveLength(1);
    expect(inserted[0]?.projectId).toBe("project-1");
  });

  it("gets run by id and job id", async () => {
    const rows = [
      {
        id: "run-1",
        projectId: "project-1",
        userId: "user-1",
        inputText: "hello",
        status: "queued",
        refweaverRunId: "up-run-1",
        refweaverJobId: "job-1",
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

    const store = createRunStore(db as never);
    const byId = await store.getRunById("user-1", "project-1", "run-1");
    const byJob = await store.getRunByJobId("user-1", "project-1", "job-1");

    expect(byId?.id).toBe("run-1");
    expect(byJob?.refweaverJobId).toBe("job-1");
    expect(whereCalls).toBe(2);
  });

  it("updates run status and optional refweaver run id", async () => {
    let current = {
      id: "run-1",
      projectId: "project-1",
      userId: "user-1",
      inputText: "hello",
      status: "queued",
      refweaverRunId: "up-run-1",
      refweaverJobId: "job-1",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const sets: Array<Record<string, unknown>> = [];

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

    const store = createRunStore(db as never);
    const updated = await store.updateRunStatus("run-1", "finished", "up-run-2");

    expect(updated?.status).toBe("finished");
    expect(updated?.refweaverRunId).toBe("up-run-2");
    expect(sets).toHaveLength(1);
  });
});
