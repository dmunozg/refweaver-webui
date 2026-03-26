import { Hono } from "hono";
import { cors } from "hono/cors";
import type { BetterAuthApp } from "./auth/better-auth";
import type { AuthStore } from "./auth/store";
import { requireAuth } from "./middleware/require-auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerHealthRoute } from "./routes/health";
import { registerProjectRoutes } from "./routes/projects";
import { registerRunRoutes } from "./routes/runs";
import type { createProjectService } from "./projects/service";
import type { createRunService } from "./runs/service";

type AppDeps = {
  auth?: BetterAuthApp;
  signupStore?: AuthStore;
  allowedOrigins?: string[];
  projectService?: ReturnType<typeof createProjectService>;
  runService?: ReturnType<typeof createRunService>;
};

export function createApp(deps: AppDeps) {
  const app = new Hono();
  const auth = deps.auth ?? deps.signupStore;

  if (!auth) {
    throw new Error("createApp requires auth or signupStore");
  }

  const allowedOrigins = deps.allowedOrigins ?? ["http://localhost:5173", "http://127.0.0.1:5173"];
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) {
          return "";
        }

        return allowedOrigins.includes(origin) ? origin : "";
      },
      credentials: true
    })
  );

  registerHealthRoute(app);
  registerAuthRoutes(app, auth);
  if (deps.projectService) {
    registerProjectRoutes(app, auth, deps.projectService);
  }
  if (deps.runService) {
    registerRunRoutes(app, auth, deps.runService);
  }
  app.get("/protected/ping", requireAuth(auth), (c) => c.json({ status: "ok" }, 200));

  return app;
}
