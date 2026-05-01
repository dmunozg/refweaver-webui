import { describe, expect, it, beforeAll, beforeEach, afterEach } from "vitest";
import { createApp } from "../app";
import { createBetterAuth } from "../auth/better-auth";
import { createDb } from "@refweaver/db";
import { eq, sql } from "drizzle-orm";
import { users, sessions, accounts, verifications, projects } from "@refweaver/db";

function getDatabaseUrl(): string | undefined {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> }; Bun?: { env?: Record<string, string | undefined> } };
  const env = g.process?.env ?? g.Bun?.env;
  return env?.TEST_DATABASE_URL ?? env?.DATABASE_URL;
}

async function truncateAuthTables(db: ReturnType<typeof createDb>["db"]): Promise<void> {
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(verifications);
  await db.delete(projects);
  await db.delete(users);
}

async function tryConnectDb(databaseUrl: string) {
  const connection = createDb(databaseUrl);
  try {
    await connection.db.execute(sql`select 1`);
    return connection;
  } catch {
    return null;
  }
}

// DB availability is determined once at load time; if unavailable, the suite is skipped
// rather than tests returning early with a pass, which created false-green behavior.
let dbAvailable = false;
let dbConnection: ReturnType<typeof createDb> | null = null;

async function initDb(): Promise<void> {
  const url = getDatabaseUrl();
  if (!url) return;
  dbConnection = await tryConnectDb(url);
  if (dbConnection) {
    try {
      await dbConnection.db.execute(sql`select 1`);
      dbAvailable = true;
    } catch {
      dbAvailable = false;
    }
  }
}
await initDb();

describe.skipIf(!dbAvailable)("auth integration (DB-backed)", () => {
  // connection is always set in beforeAll before any test runs; the non-null assertion
  // reflects that the suite throws if dbConnection is null at setup time.
  let connection: ReturnType<typeof createDb> = null!;

  beforeAll(async () => {
    connection = dbConnection as ReturnType<typeof createDb>;
    // If the suite runs but connection is missing, something is misconfigured — fail fast.
    if (!connection) {
      throw new Error(
        "DB connection is null in beforeAll. Check TEST_DATABASE_URL and DB reachability."
      );
    }
  });

  beforeEach(async () => {
    await truncateAuthTables(connection.db);
  });

  afterEach(async () => {
    await truncateAuthTables(connection.db);
  });

  const NEW_AUTH_ENV = {
    BETTER_AUTH_SECRET: "test-secret-for-integration-tests-only",
    BETTER_AUTH_URL: "http://localhost:3001",
    BFF_ALLOWED_ORIGINS: ["http://localhost:5173"]
  };

  describe("signup / signin / signout / session lifecycle", () => {
    it("signup creates user + default project + session", async () => {
      const auth = createBetterAuth(connection.db, NEW_AUTH_ENV);
      const app = createApp({ auth });

      const res = await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "alice@example.com",
          password: "password123",
          name: "Alice"
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.session).toBeDefined();
      expect(body.user.email).toBe("alice@example.com");

      // User has projectId
      const [dbUser] = await connection.db
        .select()
        .from(users)
        .where(eq(users.email, "alice@example.com"));
      expect(dbUser.projectId).not.toBeNull();

      // Session created
      const [dbSession] = await connection.db.select().from(sessions);
      expect(dbSession).toBeDefined();
    });

    it("signin works with valid credentials", async () => {
      const auth = createBetterAuth(connection.db, NEW_AUTH_ENV);
      const app = createApp({ auth });

      // First create a user via signup
      await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "bob@example.com",
          password: "secret456",
          name: "Bob"
        })
      });

      // Sign in
      const res = await app.request("/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "bob@example.com",
          password: "secret456"
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.session).toBeDefined();
    });

    it("signin rejects invalid credentials", async () => {
      const auth = createBetterAuth(connection.db, NEW_AUTH_ENV);
      const app = createApp({ auth });

      await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "carol@example.com",
          password: "password123",
          name: "Carol"
        })
      });

      const res = await app.request("/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "carol@example.com",
          password: "wrongpassword"
        })
      });

      expect(res.status).toBe(401);
    });

    it("/auth/get-session returns null user without session cookie", async () => {
      const auth = createBetterAuth(connection.db, NEW_AUTH_ENV);
      const app = createApp({ auth });

      const res = await app.request("/auth/get-session");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeNull();
    });

    it("/auth/get-session returns user with valid session", async () => {
      const auth = createBetterAuth(connection.db, NEW_AUTH_ENV);
      const app = createApp({ auth });

      // Sign up to get a session cookie
      const signupRes = await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "dave@example.com",
          password: "password123",
          name: "Dave"
        })
      });

      const setCookie = signupRes.headers.get("set-cookie") ?? "";
      const sessionCookie = setCookie.split(",").find((c) => c.includes("better-auth.session_token")) ?? "";

      const sessionRes = await app.request("/auth/get-session", {
        headers: { cookie: sessionCookie.trim() }
      });

      expect(sessionRes.status).toBe(200);
      const body = await sessionRes.json();
      expect(body.user).not.toBeNull();
      expect(body.user.email).toBe("dave@example.com");
    });

    it("/auth/get-session returns null user with invalid session", async () => {
      const auth = createBetterAuth(connection.db, NEW_AUTH_ENV);
      const app = createApp({ auth });

      const res = await app.request("/auth/get-session", {
        headers: { cookie: "better-auth.session_token=does-not-exist" }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeNull();
    });

    it("signout invalidates session", async () => {
      const auth = createBetterAuth(connection.db, NEW_AUTH_ENV);
      const app = createApp({ auth });

      // Sign up to get a session cookie
      const signupRes = await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "eve@example.com",
          password: "password123",
          name: "Eve"
        })
      });

      const setCookie = signupRes.headers.get("set-cookie") ?? "";
      const sessionCookie = setCookie.split(",").find((c) => c.includes("better-auth.session_token")) ?? "";

      // Sign out
      const signoutRes = await app.request("/auth/sign-out", {
        method: "POST",
        headers: { cookie: sessionCookie.trim() }
      });

      expect(signoutRes.status).toBe(200);

      // Session cookie should be cleared
      const clearedSetCookie = signoutRes.headers.get("set-cookie") ?? "";
      expect(clearedSetCookie).toContain("better-auth.session_token=");

      // /auth/get-session should now return null user after signout
      const sessionRes = await app.request("/auth/get-session", {
        headers: { cookie: sessionCookie.trim() }
      });
      expect(sessionRes.status).toBe(200);
      const body = await sessionRes.json();
      expect(body.user).toBeNull();
    });
  });

  describe("admin election invariant", () => {
    it("produces exactly one admin after N concurrent signups", async () => {
      const auth = createBetterAuth(connection.db, NEW_AUTH_ENV);
      const app = createApp({ auth });

      const N = 8;
      const signupPromises = Array.from({ length: N }, (_, i) => {
        const email = `concurrent${i}@example.com`;
        return app.request("/auth/sign-up/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            password: "password123",
            name: `User ${i}`
          })
        });
      });

      const responses = await Promise.all(signupPromises);
      for (const res of responses) {
        expect(res.status).toBe(200);
      }

      // connection is guaranteed non-null here because beforeAll throws if it is
      const allUsers = await connection.db.select().from(users);
      expect(allUsers).toHaveLength(N);

      // All users have projectId
      for (const u of allUsers) {
        expect(u.projectId).not.toBeNull();
      }

      // Exactly one admin
      const admins = allUsers.filter((u) => u.adminRole === "admin");
      expect(admins).toHaveLength(1);
    });
  });
});
