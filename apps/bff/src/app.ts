import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AuthStore } from "./auth/store";
import { requireAuth } from "./middleware/require-auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerHealthRoute } from "./routes/health";

type AppDeps = {
  signupStore: AuthStore;
  allowedOrigins?: string[];
};

export function createApp(deps: AppDeps) {
  const app = new Hono();

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
  registerAuthRoutes(app, deps.signupStore);
  app.get("/protected/ping", requireAuth(deps.signupStore), (c) => c.json({ status: "ok" }, 200));

  return app;
}
