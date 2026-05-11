import type { AnalysisRoute } from "./routes";

function getRouteCopy(route: AnalysisRoute) {
  switch (route.kind) {
    case "new":
      return { title: "New analysis", description: "Start a new analysis run." };
    case "list":
      return { title: "Analysis list", description: "Review saved analysis runs." };
    case "detail":
      return { title: `Analysis ${route.runId}`, description: "Review analysis run details." };
    case "dashboard":
    default:
      return { title: "Dashboard", description: "Review the latest analysis activity." };
  }
}

export function AnalysisRouteView({ route }: { route: AnalysisRoute }) {
  const copy = getRouteCopy(route);

  return (
    <section>
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>
    </section>
  );
}
