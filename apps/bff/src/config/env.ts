export type ParsedEnv = {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  REFWEAVER_API_BASE_URL: string;
  BFF_ALLOWED_ORIGINS: string[];
};

export function parseEnv(input: Record<string, string | undefined>): ParsedEnv {
  const databaseUrl = input.DATABASE_URL;
  const sessionSecret = input.SESSION_SECRET;
  const refweaverApiBaseUrl = input.REFWEAVER_API_BASE_URL;
  const bffAllowedOrigins =
    input.BFF_ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173";

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }

  if (!sessionSecret) {
    throw new Error("Missing SESSION_SECRET");
  }

  if (!refweaverApiBaseUrl) {
    throw new Error("Missing REFWEAVER_API_BASE_URL");
  }

  return {
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: sessionSecret,
    REFWEAVER_API_BASE_URL: refweaverApiBaseUrl,
    BFF_ALLOWED_ORIGINS: bffAllowedOrigins
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
  };
}
