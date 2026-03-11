import { projects, sessions, users } from "@refweaver/db";
import type { SignupStore } from "./signup";

type InsertableDb = {
  transaction<T>(fn: (tx: InsertableDb) => Promise<T>): Promise<T>;
  insert(table: unknown): {
    values(values: unknown): {
      returning(selection: unknown): Promise<Array<{ id: string }>>;
    };
  };
};

export function createSignupStore(db: InsertableDb): SignupStore {
  let activeDb = db;

  return {
    async withTransaction<T>(fn: () => Promise<T>) {
      return db.transaction(async (tx) => {
        const previousDb = activeDb;
        activeDb = tx;
        try {
          return await fn();
        } finally {
          activeDb = previousDb;
        }
      });
    },
    async createUser(input) {
      const [row] = await activeDb.insert(users).values(input).returning({ id: users.id });
      return row;
    },
    async createProject(input) {
      const [row] = await activeDb.insert(projects).values(input).returning({ id: projects.id });
      return row;
    },
    async createSession(input) {
      const [row] = await activeDb.insert(sessions).values(input).returning({ id: sessions.id });
      return row;
    }
  };
}
