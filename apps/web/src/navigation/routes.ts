export const analysisRoutes = {
  dashboard: "/dashboard",
  new: "/analyses/new",
  list: "/analyses",
  detail: (runId: string) => `/analyses/${runId}`
} as const;

export type AnalysisRoute =
  | { kind: "dashboard" }
  | { kind: "new" }
  | { kind: "list" }
  | { kind: "detail"; runId: string };

function safeDecodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function parseAnalysisRoute(pathname: string | undefined): AnalysisRoute {
  const normalizedPathname = pathname && pathname.startsWith("/") ? pathname : "/";

  if (normalizedPathname === analysisRoutes.dashboard || normalizedPathname === "/") {
    return { kind: "dashboard" };
  }

  if (normalizedPathname === analysisRoutes.new) {
    return { kind: "new" };
  }

  if (normalizedPathname === analysisRoutes.list) {
    return { kind: "list" };
  }

  const detailMatch = normalizedPathname.match(/^\/analyses\/([^/]+)$/);
  if (detailMatch) {
    const runId = safeDecodePathSegment(detailMatch[1]);
    if (runId !== null) {
      return { kind: "detail", runId };
    }
  }

  return { kind: "dashboard" };
}

export function formatAnalysisRoute(route: AnalysisRoute): string {
  switch (route.kind) {
    case "dashboard":
      return analysisRoutes.dashboard;
    case "new":
      return analysisRoutes.new;
    case "list":
      return analysisRoutes.list;
    case "detail":
      return analysisRoutes.detail(route.runId);
  }
}
