import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, projects, sessions, users } from "@refweaver/db";
import { createApp } from "../app";
import { createSignupStore } from "../auth/store";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:54329/refweaver_webui_test";

const { db, client } = createDb(databaseUrl);

async function applyMigrations() {
  const migrationPath = join(
    import.meta.dir,
    "..",
    "..",
    "..",
    "..",
    "packages",
    "db",
    "migrations",
    "0000_nebulous_dreadnoughts.sql"
  );

  const sql = readFileSync(migrationPath, "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    try {
      await client.unsafe(statement);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "42P07" && code !== "42710") {
        throw error;
      }
    }
  }
}

describe("auth signup integration", () => {
  beforeAll(async () => {
    await applyMigrations();
  });

  beforeEach(async () => {
    await client.unsafe("TRUNCATE TABLE sessions, projects, users RESTART IDENTITY CASCADE");
  });

  it("POST /auth/signup persists user, default project, and session", async () => {
    const app = createApp({ signupStore: createSignupStore(db as never) });

    const response = await app.request("/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "ada",
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "safe-pass"
      })
    });

    expect(response.status).toBe(201);

    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("rw_session=");

    const body = await response.json();
    const [userRow] = await db.select().from(users).where(eq(users.id, body.userId));
    expect(userRow.username).toBe("ada");
    expect(userRow.teamId).toBeNull();

    const [projectRow] = await db.select().from(projects).where(eq(projects.id, body.projectId));
    expect(projectRow.name).toBe("My First Project");
    expect(projectRow.ownerUserId).toBe(body.userId);
    expect(projectRow.teamId).toBeNull();

    const [sessionRow] = await db.select().from(sessions).where(eq(sessions.userId, body.userId));
    expect(sessionRow.userId).toBe(body.userId);
    expect(sessionRow.sessionTokenHash).not.toHaveLength(0);
  });
});
