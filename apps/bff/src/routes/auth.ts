import type { Hono } from "hono";
import type { BetterAuthApp } from "../auth/better-auth";
import type { AuthStore } from "../auth/store";
import { deleteCookie, setCookie } from "hono/cookie";
import { isUniqueViolation } from "../auth/errors";
import { login } from "../auth/login";
import { logout } from "../auth/logout";
import {
  getSessionTokenFromCookieHeader,
  hashSessionToken,
  isSessionExpired
} from "../auth/session";
import { signup } from "../auth/signup";

const runtimeEnv = globalThis as {
  Bun?: { env?: Record<string, string | undefined> };
  process?: { env?: Record<string, string | undefined> };
};

const isProduction = (runtimeEnv.Bun?.env?.NODE_ENV ?? runtimeEnv.process?.env?.NODE_ENV) === "production";

type LegacyAuthStore = AuthStore;

function isBetterAuth(auth: BetterAuthApp | LegacyAuthStore): auth is BetterAuthApp {
  return "api" in auth;
}

export function registerAuthRoutes(app: Hono, auth: BetterAuthApp | LegacyAuthStore): void {
  if (isBetterAuth(auth)) {
    app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));
    app.on(["GET", "POST"], "/auth", (c) => auth.handler(c.req.raw));
    return;
  }

  app.post("/auth/signup", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_signup_payload" }, 422);
    }

    if (!body || typeof body !== "object") {
      return c.json({ error: "invalid_signup_payload" }, 422);
    }

    const payload = body as Record<string, unknown>;
    if (
      typeof payload.username !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.password !== "string"
    ) {
      return c.json({ error: "invalid_signup_payload" }, 422);
    }

    let result;
    try {
      result = await signup(
        {
          username: payload.username,
          email: payload.email,
          name: payload.name,
          password: payload.password
        },
        auth as any
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: "signup_conflict" }, 409);
      }

      throw error;
    }

    setCookie(c, "rw_session", result.sessionToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: isProduction,
      expires: result.sessionExpiresAt,
      path: "/"
    });

    return c.json(
      {
        userId: result.userId,
        projectId: result.projectId
      },
      201
    );
  });

  app.post("/auth/login", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_login_payload" }, 422);
    }
    if (!body || typeof body !== "object") {
      return c.json({ error: "invalid_login_payload" }, 422);
    }

    const payload = body as Record<string, unknown>;
    if (typeof payload.identifier !== "string" || typeof payload.password !== "string") {
      return c.json({ error: "invalid_login_payload" }, 422);
    }

    try {
      const result = await login(
        { identifier: payload.identifier, password: payload.password },
        auth as any
      );

      setCookie(c, "rw_session", result.sessionToken, {
        httpOnly: true,
        sameSite: "Lax",
        secure: isProduction,
        expires: result.sessionExpiresAt,
        path: "/"
      });

      return c.json({ userId: result.userId }, 200);
    } catch (error) {
      if (error instanceof Error && error.message === "invalid_credentials") {
        return c.json({ error: "invalid_credentials" }, 401);
      }
      throw error;
    }
  });

  app.get("/auth/me", async (c) => {
    const token = getSessionTokenFromCookieHeader(c.req.header("cookie"));
    if (!token) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const tokenHash = hashSessionToken(token);
    const session = await auth.findSessionByTokenHash(tokenHash);
    if (!session || typeof session.userId !== "string" || isSessionExpired(session.expiresAt)) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const user = await auth.findUserById(session.userId);
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    return c.json(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          teamId: user.teamId ?? null
        }
      },
      200
    );
  });

  app.post("/auth/logout", async (c) => {
    const token = getSessionTokenFromCookieHeader(c.req.header("cookie"));
    const tokenHash = token ? hashSessionToken(token) : null;
    await logout(tokenHash, auth);

    deleteCookie(c, "rw_session", {
      path: "/"
    });

    return c.body(null, 204);
  });
}
