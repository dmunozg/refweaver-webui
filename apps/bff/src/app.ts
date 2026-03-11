import { Hono } from "hono";
import type { AuthStore } from "./auth/store";
import { requireAuth } from "./middleware/require-auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerHealthRoute } from "./routes/health";

type AppDeps = {
  signupStore: AuthStore;
};

export function createApp(deps: AppDeps) {
  const app = new Hono();

  registerHealthRoute(app);
  registerAuthRoutes(app, deps.signupStore);
  app.get("/protected/ping", requireAuth(deps.signupStore), (c) => c.json({ status: "ok" }, 200));

  return app;
}
