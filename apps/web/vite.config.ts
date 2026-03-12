import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const allowedHosts = (env.VITE_ALLOWED_HOSTS ?? "localhost,127.0.0.1")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  console.log("[vite] allowedHosts:", allowedHosts);

  return {
    server: {
      allowedHosts
    }
  };
});
