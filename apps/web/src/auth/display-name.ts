import type { AuthUser } from "./types";

export function getUserDisplayName(user: AuthUser): string {
  if (user.username && user.username.trim().length > 0) {
    return user.username;
  }

  if (user.name.trim().length > 0) {
    return user.name;
  }

  return user.email.split("@")[0] ?? user.email;
}
