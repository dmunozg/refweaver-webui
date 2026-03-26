import { serve } from "bun";
import { createDb } from "@refweaver/db";
import { createApp } from "./app";
import { createBetterAuth } from "./auth/better-auth";
import { parseEnv } from "./config/env";
import { createProjectStore } from "./projects/store";
import { createProjectService } from "./projects/service";
import { createRunStore } from "./runs/store";
import { createRunService } from "./runs/service";
import { createRefweaverClient } from "./refweaver/client";

const runtimeEnv = globalThis as {
  Bun?: { env?: Record<string, string | undefined> };
  process?: { env?: Record<string, string | undefined> };
};
const env = parseEnv(runtimeEnv.Bun?.env ?? runtimeEnv.process?.env ?? {});
const port = Number((runtimeEnv.Bun?.env?.PORT ?? runtimeEnv.process?.env?.PORT) ?? 3001);
const { db } = createDb(env.DATABASE_URL);
const auth = createBetterAuth(db, env);
const projectStore = createProjectStore(db);
const projectService = createProjectService(projectStore);
const runStore = createRunStore(db);
const refweaverClient = createRefweaverClient({
  baseUrl: env.REFWEAVER_API_BASE_URL,
  apiKey: runtimeEnv.Bun?.env?.REFWEAVER_API_KEY ?? runtimeEnv.process?.env?.REFWEAVER_API_KEY
});
const runService = createRunService({
  store: runStore,
  refweaver: refweaverClient,
  projects: projectService
});
const app = createApp({
  auth,
  allowedOrigins: env.BFF_ALLOWED_ORIGINS,
  projectService,
  runService
});

serve({
  port,
  fetch: app.fetch
});

console.log(`bff listening on http://localhost:${port}`);
