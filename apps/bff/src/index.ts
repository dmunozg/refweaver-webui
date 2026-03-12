import { serve } from "bun";
import { createDb } from "@refweaver/db";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createSignupStore } from "./auth/store";

const env = parseEnv(process.env);
const port = Number(process.env.PORT ?? 3001);
const { db } = createDb(env.DATABASE_URL);
const signupStore = createSignupStore(db);
const app = createApp({
  signupStore,
  allowedOrigins: env.BFF_ALLOWED_ORIGINS
});

serve({
  port,
  fetch: app.fetch
});

console.log(`bff listening on http://localhost:${port}`);
