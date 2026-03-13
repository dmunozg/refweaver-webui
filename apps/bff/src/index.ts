import { serve } from "bun";
import { createDb } from "@refweaver/db";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createSignupStore } from "./auth/store";
import { createProjectStore } from "./projects/store";
import { createProjectService } from "./projects/service";
import { createRunStore } from "./runs/store";
import { createRunService } from "./runs/service";
import { createRefweaverClient } from "./refweaver/client";

const env = parseEnv(process.env);
const port = Number(process.env.PORT ?? 3001);
const { db } = createDb(env.DATABASE_URL);
const signupStore = createSignupStore(db);
const projectStore = createProjectStore(db);
const projectService = createProjectService(projectStore);
const runStore = createRunStore(db);
const refweaverClient = createRefweaverClient({
  baseUrl: env.REFWEAVER_API_BASE_URL,
  apiKey: process.env.REFWEAVER_API_KEY || undefined
});
const runService = createRunService({
  store: runStore,
  refweaver: refweaverClient,
  projects: projectService
});
const app = createApp({
  signupStore,
  allowedOrigins: env.BFF_ALLOWED_ORIGINS,
  projectService,
  runService
});

serve({
  port,
  fetch: app.fetch
});

console.log(`bff listening on http://localhost:${port}`);
