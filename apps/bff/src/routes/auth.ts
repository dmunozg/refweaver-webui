import type { Hono } from "hono";
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
import type { AuthStore } from "../auth/store";

type SignupBody = {
  username: string;
  email: string;
  name: string;
  password: string;
};

function isSignupBody(input: unknown): input is SignupBody {
  if (!input || typeof input !== "object") {
    return false;
  }

  const body = input as Record<string, unknown>;
  return (
    typeof body.username === "string" &&
    typeof body.email === "string" &&
    typeof body.name === "string" &&
    typeof body.password === "string"
  );
}

export function registerAuthRoutes(app: Hono, store: AuthStore): void {
  app.post("/auth/signup", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_signup_payload" }, 422);
    }

    if (!isSignupBody(body)) {
      return c.json({ error: "invalid_signup_payload" }, 422);
    }

    let result;
    try {
      result = await signup(body, store);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: "signup_conflict" }, 409);
      }

      throw error;
    }

    setCookie(c, "rw_session", result.sessionToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
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
        store
      );

      setCookie(c, "rw_session", result.sessionToken, {
        httpOnly: true,
        sameSite: "Lax",
        secure: process.env.NODE_ENV === "production",
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
    const session = await store.findSessionByTokenHash(tokenHash);
    if (!session || typeof session.userId !== "string" || isSessionExpired(session.expiresAt)) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const user = await store.findUserById(session.userId);
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
    await logout(tokenHash, store);

    deleteCookie(c, "rw_session", {
      path: "/"
    });

    return c.body(null, 204);
  });
}
