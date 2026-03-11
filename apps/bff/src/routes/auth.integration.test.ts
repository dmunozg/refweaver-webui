import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, projects, sessions, users } from "@refweaver/db";
import { createApp } from "../app";
import { hashSessionToken } from "../auth/session";
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

  it("POST /auth/login authenticates valid credentials", async () => {
    const app = createApp({ signupStore: createSignupStore(db as never) });

    await app.request("/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "lin",
        email: "lin@example.com",
        name: "Lin",
        password: "safe-pass"
      })
    });

    const response = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "lin", password: "safe-pass" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("rw_session=");
  });

  it("POST /auth/login rejects invalid credentials", async () => {
    const app = createApp({ signupStore: createSignupStore(db as never) });

    await app.request("/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "lin",
        email: "lin@example.com",
        name: "Lin",
        password: "safe-pass"
      })
    });

    const response = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "lin", password: "wrong-pass" })
    });

    expect(response.status).toBe(401);
  });

  it("GET /auth/me returns unauthorized when cookie missing", async () => {
    const app = createApp({ signupStore: createSignupStore(db as never) });
    const response = await app.request("/auth/me");
    expect(response.status).toBe(401);
  });

  it("GET /auth/me returns user for valid session and rejects expired session", async () => {
    const app = createApp({ signupStore: createSignupStore(db as never) });

    const signupResponse = await app.request("/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "lin",
        email: "lin@example.com",
        name: "Lin",
        password: "safe-pass"
      })
    });

    const cookie = signupResponse.headers.get("set-cookie")!;
    const token = cookie.split("rw_session=")[1]!.split(";")[0]!;

    const okResponse = await app.request("/auth/me", {
      headers: { cookie: `rw_session=${token}` }
    });
    expect(okResponse.status).toBe(200);

    await client.unsafe(
      "UPDATE sessions SET expires_at = now() - interval '1 minute' WHERE session_token_hash = $1",
      [hashSessionToken(token)]
    );

    const expiredResponse = await app.request("/auth/me", {
      headers: { cookie: `rw_session=${token}` }
    });
    expect(expiredResponse.status).toBe(401);
  });

  it("POST /auth/logout invalidates session", async () => {
    const app = createApp({ signupStore: createSignupStore(db as never) });

    const signupResponse = await app.request("/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "lin",
        email: "lin@example.com",
        name: "Lin",
        password: "safe-pass"
      })
    });

    const cookie = signupResponse.headers.get("set-cookie")!;
    const token = cookie.split("rw_session=")[1]!.split(";")[0]!;

    const logoutResponse = await app.request("/auth/logout", {
      method: "POST",
      headers: { cookie: `rw_session=${token}` }
    });

    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.headers.get("set-cookie")).toContain("rw_session=");

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionTokenHash, hashSessionToken(token)));
    expect(rows).toHaveLength(0);
  });
});
