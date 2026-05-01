import { eq, sql } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { projects, users, type Database } from "@refweaver/db";

export type BetterAuthApp = {
  handler(request: Request): Response | Promise<Response>;
  api: {
    getSession(args: { headers: Headers }): Promise<{ user: { id: string } } | null>;
  };
};

type AuthEnv = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BFF_ALLOWED_ORIGINS: string[];
};

export function createBetterAuth(db: Database, env: AuthEnv): BetterAuthApp {
  const auth = betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/auth",
    trustedOrigins: env.BFF_ALLOWED_ORIGINS,
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false
    },
    user: {
      modelName: "users",
      additionalFields: {
        username: {
          type: "string",
          required: false
        },
        adminRole: {
          type: ["user", "admin"] as const,
          required: false,
          defaultValue: "user",
          input: false
        },
        projectId: {
          type: "string",
          required: false,
          input: false
        }
      }
    },
    session: {
      modelName: "sessions"
    },
    account: {
      modelName: "accounts"
    },
    verification: {
      modelName: "verifications"
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await db.transaction(async (tx) => {
              await tx.execute(sql`select pg_advisory_xact_lock(424242)`);

              // Check if any admin exists - only the first admin gets admin role
              const [{ adminExists }] = await tx
                .select({ adminExists: sql<boolean>`exists(select 1 from "users" where "admin_role" = 'admin')` })
                .from(users)
                .limit(1);

              const [project] = await tx
                .insert(projects)
                .values({
                  name: "My First Project",
                  ownerUserId: user.id,
                  teamId: null
                })
                .returning({ id: projects.id });

              await tx
                .update(users)
                .set({
                  adminRole: adminExists ? "user" : "admin",
                  projectId: project.id
                })
                .where(eq(users.id, user.id));
            });
          }
        }
      }
    }
  });

  return auth as BetterAuthApp;
}
