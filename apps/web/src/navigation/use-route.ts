import { useEffect, useState } from "react";
import { formatAnalysisRoute, parseAnalysisRoute, type AnalysisRoute } from "./routes";

type RouteState = {
  pathname: string;
  route: AnalysisRoute;
  navigate: (pathname: string) => void;
};

function readPathname() {
  return window.location.pathname;
}

export function useRoute(): RouteState {
  const [pathname, setPathname] = useState(readPathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(readPathname());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPathname: string) {
    const next = nextPathname.startsWith("/") ? nextPathname : formatAnalysisRoute(parseAnalysisRoute(nextPathname));
    window.history.pushState({}, "", next);
    setPathname(next);
  }

  return {
    pathname,
    route: parseAnalysisRoute(pathname),
    navigate
  };
}
