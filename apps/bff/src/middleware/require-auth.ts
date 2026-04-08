import type { Context, Next } from "hono";
import type { BetterAuthApp } from "../auth/better-auth";

export function requireAuth(auth: BetterAuthApp) {
  return async (c: Context, next: Next) => {
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session) {
        return c.json({ error: "unauthorized" }, 401);
      }

      c.set("authUser", session.user);
      await next();
    } catch {
      return c.json({ error: "auth_unavailable" }, 503);
    }
  };
}
