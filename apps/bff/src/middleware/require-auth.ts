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
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "auth.session_lookup_failed",
          path: c.req.path,
          method: c.req.method,
          error: error instanceof Error ? error.message : String(error)
        })
      );
      return c.json({ error: "auth_unavailable" }, 503);
    }
  };
}
