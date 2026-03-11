import { createHash } from "node:crypto";

export function getSessionTokenFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith("rw_session=")) {
      return part.slice("rw_session=".length);
    }
  }

  return null;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isSessionExpired(expiresAt: unknown, now = new Date()): boolean {
  if (!expiresAt) {
    return true;
  }

  const value = expiresAt instanceof Date ? expiresAt : new Date(String(expiresAt));
  if (Number.isNaN(value.getTime())) {
    return true;
  }

  return value.getTime() <= now.getTime();
}
