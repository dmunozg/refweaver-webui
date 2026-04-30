import type { Hono } from "hono";

export function registerHealthRoute(app: Hono<object>): void {
  app.get("/health", (c) => c.json({ status: "ok" }, 200));
}
