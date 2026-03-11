import { eq, or } from "drizzle-orm";
import { projects, sessions, users } from "@refweaver/db";
import type { SignupStore } from "./signup";

type InsertableDb = {
  transaction<T>(fn: (tx: InsertableDb) => Promise<T>): Promise<T>;
  insert(table: unknown): {
    values(values: unknown): {
      returning(selection: unknown): Promise<Array<{ id: string }>>;
    };
  };
  select(): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
};

export type AuthStore = SignupStore & {
  findUserByIdentifier(identifier: string): Promise<Record<string, unknown> | null>;
  findSessionByTokenHash(tokenHash: string): Promise<Record<string, unknown> | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
};

export function createSignupStore(db: InsertableDb): AuthStore {
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
    },
    async findUserByIdentifier(identifier) {
      const rows = await activeDb
        .select()
        .from(users)
        .where(or(eq(users.username, identifier), eq(users.email, identifier)))
        .limit(1);

      return rows[0] ?? null;
    },
    async findSessionByTokenHash(tokenHash) {
      const rows = await activeDb
        .select()
        .from(sessions)
        .where(eq(sessions.sessionTokenHash, tokenHash))
        .limit(1);

      return rows[0] ?? null;
    },
    async deleteSessionByTokenHash(tokenHash) {
      await activeDb.delete(sessions).where(eq(sessions.sessionTokenHash, tokenHash));
    }
  };
}
