export type ParsedEnv = {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  REFWEAVER_API_BASE_URL: string;
  BFF_ALLOWED_ORIGINS: string[];
};

function parseAllowedOrigins(input: string): string[] {
  const candidates = input
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (candidates.length === 0) {
    throw new Error("BFF_ALLOWED_ORIGINS must include at least one origin");
  }

  return candidates.map((value) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`Invalid BFF_ALLOWED_ORIGINS entry: ${value}`);
    }

    const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
    const isOriginOnly = parsed.pathname === "/" && parsed.search === "" && parsed.hash === "";
    if (!isHttp || !isOriginOnly) {
      throw new Error(`Invalid BFF_ALLOWED_ORIGINS entry: ${value}`);
    }

    return parsed.origin;
  });
}

export function parseEnv(input: Record<string, string | undefined>): ParsedEnv {
  const databaseUrl = input.DATABASE_URL;
  const sessionSecret = input.SESSION_SECRET;
  const betterAuthSecret = input.BETTER_AUTH_SECRET;
  const betterAuthUrl = input.BETTER_AUTH_URL;
  const refweaverApiBaseUrl = input.REFWEAVER_API_BASE_URL;
  const bffAllowedOrigins =
    input.BFF_ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173";

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }

  if (!sessionSecret) {
    throw new Error("Missing SESSION_SECRET");
  }

  if (!betterAuthSecret) {
    throw new Error("Missing BETTER_AUTH_SECRET");
  }

  if (!betterAuthUrl) {
    throw new Error("Missing BETTER_AUTH_URL");
  }

  if (!refweaverApiBaseUrl) {
    throw new Error("Missing REFWEAVER_API_BASE_URL");
  }

  return {
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: sessionSecret,
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    REFWEAVER_API_BASE_URL: refweaverApiBaseUrl,
    BFF_ALLOWED_ORIGINS: parseAllowedOrigins(bffAllowedOrigins)
  };
}
