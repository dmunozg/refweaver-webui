export type ParsedEnv = {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  REFWEAVER_API_BASE_URL: string;
};

export function parseEnv(input: Record<string, string | undefined>): ParsedEnv {
  const databaseUrl = input.DATABASE_URL;
  const sessionSecret = input.SESSION_SECRET;
  const refweaverApiBaseUrl = input.REFWEAVER_API_BASE_URL;

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
    REFWEAVER_API_BASE_URL: refweaverApiBaseUrl
  };
}
