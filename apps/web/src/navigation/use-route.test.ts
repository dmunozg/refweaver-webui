import TestRenderer, { act } from "react-test-renderer";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { analysisRoutes, formatAnalysisRoute, parseAnalysisRoute } from "./routes";
import { useRoute } from "./use-route";
import { installMockWindow } from "./test-window";

describe("analysis routes", () => {
  it("parses and formats analysis screen paths", () => {
    expect(parseAnalysisRoute("/dashboard")).toEqual({ kind: "dashboard" });
    expect(parseAnalysisRoute("/analyses/new")).toEqual({ kind: "new" });
    expect(parseAnalysisRoute("/analyses")).toEqual({ kind: "list" });
    expect(parseAnalysisRoute("/analyses/run-123")).toEqual({ kind: "detail", runId: "run-123" });
    expect(formatAnalysisRoute({ kind: "dashboard" })).toBe(analysisRoutes.dashboard);
    expect(formatAnalysisRoute({ kind: "new" })).toBe(analysisRoutes.new);
    expect(formatAnalysisRoute({ kind: "list" })).toBe(analysisRoutes.list);
    expect(formatAnalysisRoute({ kind: "detail", runId: "run-123" })).toBe("/analyses/run-123");
  });
});

describe("useRoute", () => {
  let renderer: TestRenderer.ReactTestRenderer | null = null;
  let latestRoute: ReturnType<typeof useRoute> | null = null;

  function Harness() {
    latestRoute = useRoute();
    return null;
  }

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer?.unmount();
      });
    }
    renderer = null;
    latestRoute = null;
    delete (globalThis as any).window;
  });

  beforeEach(() => {
    installMockWindow("/");
  });

  it("tracks pathname changes from navigate and popstate", async () => {
    window.history.replaceState({}, "", "/dashboard");

    await act(async () => {
      renderer = TestRenderer.create(createElement(Harness));
    });

    expect(latestRoute?.pathname).toBe("/dashboard");
    expect(latestRoute?.route).toEqual({ kind: "dashboard" });

    act(() => {
      latestRoute?.navigate({ kind: "new" });
    });

    expect(latestRoute?.pathname).toBe("/analyses/new");
    expect(latestRoute?.route).toEqual({ kind: "new" });

    window.history.pushState({}, "", "/analyses/run-123");
    await act(async () => {
      window.dispatchEvent({ type: "popstate" } as Event);
      await Promise.resolve();
    });

    expect(latestRoute?.pathname).toBe("/analyses/run-123");
    expect(latestRoute?.route).toEqual({ kind: "detail", runId: "run-123" });
  });
});
