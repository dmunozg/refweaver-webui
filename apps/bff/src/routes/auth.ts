import type { Hono } from "hono";
import type { BetterAuthApp } from "../auth/better-auth";

export function registerAuthRoutes(app: Hono<object>, auth: BetterAuthApp): void {
  app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));
  app.on(["GET", "POST"], "/auth", (c) => auth.handler(c.req.raw));
}
