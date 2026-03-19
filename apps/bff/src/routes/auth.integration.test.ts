import { readdirSync, readFileSync } from "node:fs";
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

type MigrationStatement = {
  fileName: string;
  statementIndex: number;
  sql: string;
};

type MigrationJournalEntry = {
  idx: number;
  tag: string;
};

function getMigrationsDir() {
  return join(
    import.meta.dir,
    "..",
    "..",
    "..",
    "..",
    "packages",
    "db",
    "migrations"
  );
}

function getMigrationFilesFromJournal() {
  const migrationsDir = getMigrationsDir();
  const journalPath = join(migrationsDir, "meta", "_journal.json");
  const journalSqlFiles = new Set(
    readdirSync(migrationsDir)
      .filter((entry) => entry.endsWith(".sql"))
      .map((entry) => entry)
  );

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: MigrationJournalEntry[];
  };

  if (!Array.isArray(journal.entries)) {
    throw new Error(
      `Invalid migration journal at ${journalPath}: expected an entries array.`
    );
  }

  return [...journal.entries]
    .sort((left, right) => left.idx - right.idx)
    .map(({ tag }) => `${tag}.sql`)
    .map((fileName) => {
      if (!journalSqlFiles.has(fileName)) {
        throw new Error(
          `Migration listed in journal is missing SQL file: ${fileName} (journal=${journalPath})`
        );
      }

      return fileName;
    });
}

function getMigrationStatements(fileName: string): MigrationStatement[] {
  const migrationPath = join(
    import.meta.dir,
    "..",
    "..",
    "..",
    "..",
    "packages",
    "db",
    "migrations",
    fileName
  );

  const sql = readFileSync(migrationPath, "utf8");
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement, index) => ({
      fileName,
      statementIndex: index + 1,
      sql: statement
    }));
}

async function applyMigrations(fileNames: string[] = getMigrationFilesFromJournal()) {
  const statements = fileNames.flatMap(getMigrationStatements);

  for (const statement of statements) {
    try {
      await client.unsafe(statement.sql);
    } catch (error) {
      const pgError = error as { code?: string; message?: string };
      const statementPreview = statement.sql
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);

      throw new Error(
        `Migration failed (${statement.fileName} statement ${statement.statementIndex}, code=${pgError.code ?? "unknown"}): ${pgError.message ?? "unknown error"}. SQL preview: ${statementPreview}`,
        { cause: error }
      );
    }
  }
}

async function resetDatabase() {
  await client.unsafe("SET client_min_messages TO warning");
  await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await client.unsafe("CREATE SCHEMA public");
  await client.unsafe("CREATE EXTENSION IF NOT EXISTS pgcrypto");
}

describe("auth signup integration", () => {
  beforeAll(async () => {
    await resetDatabase();
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

  it("enforces unique non-null refweaver job IDs per user", async () => {
    const app = createApp({ signupStore: createSignupStore(db as never) });

    const signupResponse = await app.request("/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "grace",
        email: "grace@example.com",
        name: "Grace Hopper",
        password: "safe-pass"
      })
    });

    expect(signupResponse.status).toBe(201);
    const body = await signupResponse.json();

    await client.unsafe(
      `INSERT INTO analysis_runs (project_id, user_id, input_text, status, refweaver_job_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [body.projectId, body.userId, "first", "queued", "job-1"]
    );

    let duplicateError: { code?: string } | undefined;

    try {
      await client.unsafe(
        `INSERT INTO analysis_runs (project_id, user_id, input_text, status, refweaver_job_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [body.projectId, body.userId, "second", "queued", "job-1"]
      );
    } catch (error) {
      duplicateError = error as { code?: string };
    }

    expect(duplicateError?.code).toBe("23505");

    await client.unsafe(
      `INSERT INTO analysis_runs (project_id, user_id, input_text, status, refweaver_job_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [body.projectId, body.userId, "third", "queued", null]
    );
    await client.unsafe(
      `INSERT INTO analysis_runs (project_id, user_id, input_text, status, refweaver_job_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [body.projectId, body.userId, "fourth", "queued", null]
    );
  });

  it("upgrades legacy duplicate refweaver job IDs before adding unique index", async () => {
    await resetDatabase();
    await applyMigrations(["0000_nebulous_dreadnoughts.sql"]);

    await client.unsafe(
      "ALTER TABLE projects ADD COLUMN deleted_at timestamp with time zone"
    );

    await client.unsafe(
      `CREATE TABLE analysis_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        project_id uuid NOT NULL,
        user_id uuid NOT NULL,
        input_text text NOT NULL,
        status text NOT NULL,
        refweaver_run_id text,
        refweaver_job_id text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )`
    );

    await client.unsafe(
      "ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE cascade ON UPDATE no action"
    );
    await client.unsafe(
      "ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE cascade ON UPDATE no action"
    );
    await client.unsafe(
      "CREATE INDEX analysis_runs_project_created_idx ON analysis_runs USING btree (project_id, created_at)"
    );
    await client.unsafe(
      "CREATE INDEX analysis_runs_user_created_idx ON analysis_runs USING btree (user_id, created_at)"
    );
    await client.unsafe(
      "CREATE INDEX analysis_runs_refweaver_job_legacy_idx ON analysis_runs USING btree (refweaver_job_id)"
    );

    const legacyUserId = "11111111-1111-1111-1111-111111111111";
    const legacyProjectId = "22222222-2222-2222-2222-222222222222";

    await client.unsafe(
      `INSERT INTO users (id, username, email, name, password_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [legacyUserId, "legacy-user", "legacy@example.com", "Legacy User", "hash"]
    );
    await client.unsafe(
      `INSERT INTO projects (id, name, owner_user_id)
       VALUES ($1, $2, $3)`,
      [legacyProjectId, "Legacy Project", legacyUserId]
    );

    await client.unsafe(
      `INSERT INTO analysis_runs
       (id, project_id, user_id, input_text, status, refweaver_job_id, created_at, updated_at)
       VALUES
       ('00000000-0000-0000-0000-000000000001', $1, $2, 'first', 'queued', 'job-legacy', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
       ('00000000-0000-0000-0000-000000000002', $1, $2, 'second', 'queued', 'job-legacy', '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')`,
      [legacyProjectId, legacyUserId]
    );

    await applyMigrations(["0001_little_daimon_hellstrom.sql"]);

    const dedupedRows = await client.unsafe<{ id: string; refweaver_job_id: string | null }[]>(
      `SELECT id, refweaver_job_id
       FROM analysis_runs
       WHERE user_id = $1
       ORDER BY id`,
      [legacyUserId]
    );

    expect(dedupedRows).toEqual([
      { id: "00000000-0000-0000-0000-000000000001", refweaver_job_id: "job-legacy" },
      { id: "00000000-0000-0000-0000-000000000002", refweaver_job_id: null }
    ]);

    let duplicateInsertError: { code?: string } | undefined;

    try {
      await client.unsafe(
        `INSERT INTO analysis_runs (project_id, user_id, input_text, status, refweaver_job_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [legacyProjectId, legacyUserId, "third", "queued", "job-legacy"]
      );
    } catch (error) {
      duplicateInsertError = error as { code?: string };
    }

    expect(duplicateInsertError?.code).toBe("23505");
  });
});
