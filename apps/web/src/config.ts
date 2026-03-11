export type WebConfig = {
  bffBaseUrl: string;
};

export function getWebConfig(): WebConfig {
  return {
    bffBaseUrl: import.meta.env.VITE_BFF_BASE_URL ?? "http://localhost:3001"
  };
}
