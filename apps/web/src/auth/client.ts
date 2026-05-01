import { createAuthClient } from "better-auth/react";
import { getWebConfig } from "../config";

const { bffBaseUrl } = getWebConfig();

export const authClient = createAuthClient({
  baseURL: `${bffBaseUrl}/auth`
});
