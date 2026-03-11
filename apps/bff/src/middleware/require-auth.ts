import type { Context, Next } from "hono";
import {
  getSessionTokenFromCookieHeader,
  hashSessionToken,
  isSessionExpired
} from "../auth/session";
import type { AuthStore } from "../auth/store";

export function requireAuth(store: AuthStore) {
  return async (c: Context, next: Next) => {
    const token = getSessionTokenFromCookieHeader(c.req.header("cookie"));
    if (!token) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const session = await store.findSessionByTokenHash(hashSessionToken(token));
    if (!session || typeof session.userId !== "string" || isSessionExpired(session.expiresAt)) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const user = await store.findUserById(session.userId);
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    c.set("authUser", user);
    await next();
  };
}
