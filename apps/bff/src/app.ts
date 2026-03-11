import { Hono } from "hono";
import type { AuthStore } from "./auth/store";
import { registerAuthRoutes } from "./routes/auth";
import { registerHealthRoute } from "./routes/health";

type AppDeps = {
  signupStore: AuthStore;
};

export function createApp(deps: AppDeps) {
  const app = new Hono();

  registerHealthRoute(app);
  registerAuthRoutes(app, deps.signupStore);

  return app;
}
