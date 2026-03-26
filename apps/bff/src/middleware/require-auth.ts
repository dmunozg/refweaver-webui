import type { Context, Next } from "hono";
import type { BetterAuthApp } from "../auth/better-auth";
import type { AuthStore } from "../auth/store";
import {
  getSessionTokenFromCookieHeader,
  hashSessionToken,
  isSessionExpired
} from "../auth/session";

type LegacyAuthStore = AuthStore;

function isBetterAuth(auth: BetterAuthApp | LegacyAuthStore): auth is BetterAuthApp {
  return "api" in auth;
}

export function requireAuth(auth: BetterAuthApp | LegacyAuthStore) {
  return async (c: Context, next: Next) => {
    if (isBetterAuth(auth)) {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session) {
        return c.json({ error: "unauthorized" }, 401);
      }

      c.set("authUser", session.user);
      await next();
      return;
    }

    const token = getSessionTokenFromCookieHeader(c.req.header("cookie"));
    if (!token) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const session = await auth.findSessionByTokenHash(hashSessionToken(token));
    if (!session || typeof session.userId !== "string" || isSessionExpired(session.expiresAt)) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const user = await auth.findUserById(session.userId);
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    c.set("authUser", user);
    await next();
  };
}
