import { Hono } from "hono";
import type { SignupStore } from "./auth/signup";
import { registerAuthRoutes } from "./routes/auth";
import { registerHealthRoute } from "./routes/health";

type AppDeps = {
  signupStore: SignupStore;
};

export function createApp(deps: AppDeps) {
  const app = new Hono();

  registerHealthRoute(app);
  registerAuthRoutes(app, deps.signupStore);

  return app;
}
