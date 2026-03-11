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
  findUserById(userId: string): Promise<Record<string, unknown> | null>;
  findSessionByTokenHash(tokenHash: string): Promise<Record<string, unknown> | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
};

function createStoreForDb(db: InsertableDb): AuthStore {
  return {
    async withTransaction<T>(fn: (store: AuthStore) => Promise<T>) {
      return db.transaction(async (tx) => fn(createStoreForDb(tx as InsertableDb)));
    },
    async createUser(input) {
      const [row] = await db.insert(users).values(input).returning({ id: users.id });
      return row;
    },
    async createProject(input) {
      const [row] = await db.insert(projects).values(input).returning({ id: projects.id });
      return row;
    },
    async createSession(input) {
      const [row] = await db.insert(sessions).values(input).returning({ id: sessions.id });
      return row;
    },
    async findUserByIdentifier(identifier) {
      const rows = await db
        .select()
        .from(users)
        .where(or(eq(users.username, identifier), eq(users.email, identifier)))
        .limit(1);

      return rows[0] ?? null;
    },
    async findUserById(userId) {
      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return rows[0] ?? null;
    },
    async findSessionByTokenHash(tokenHash) {
      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionTokenHash, tokenHash))
        .limit(1);

      return rows[0] ?? null;
    },
    async deleteSessionByTokenHash(tokenHash) {
      await db.delete(sessions).where(eq(sessions.sessionTokenHash, tokenHash));
    }
  };
}

export function createSignupStore(db: InsertableDb): AuthStore {
  return createStoreForDb(db);
}
