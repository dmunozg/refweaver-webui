import { eq, sql } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { projects, users } from "@refweaver/db";

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

export function createBetterAuth(db: any, env: AuthEnv): BetterAuthApp {
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
            const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(users);
            const isFirstUser = Number(total) === 1;

            const [project] = await db
              .insert(projects)
              .values({
                name: "My First Project",
                ownerUserId: user.id,
                teamId: null
              })
              .returning({ id: projects.id });

            await db
              .update(users)
              .set({
                adminRole: isFirstUser ? "admin" : "user",
                projectId: project.id
              })
              .where(eq(users.id, user.id));
          }
        }
      }
    }
  });

  return auth as BetterAuthApp;
}
