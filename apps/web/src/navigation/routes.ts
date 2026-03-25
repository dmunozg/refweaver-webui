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

export function parseAnalysisRoute(pathname: string): AnalysisRoute {
  if (pathname === analysisRoutes.dashboard || pathname === "/") {
    return { kind: "dashboard" };
  }

  if (pathname === analysisRoutes.new) {
    return { kind: "new" };
  }

  if (pathname === analysisRoutes.list) {
    return { kind: "list" };
  }

  const detailMatch = pathname.match(/^\/analyses\/([^/]+)$/);
  if (detailMatch) {
    return { kind: "detail", runId: decodeURIComponent(detailMatch[1]) };
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
