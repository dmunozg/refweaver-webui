import { useEffect, useState } from "react";
import { getWebConfig } from "../config";

type DefaultProjectState =
  | { status: "loading" }
  | { status: "ready"; projectId: string }
  | { status: "error"; error: string };

const { bffBaseUrl } = getWebConfig();

function isProjectListResponse(input: unknown): input is { projects: Array<{ id: string }> } {
  if (!input || typeof input !== "object") {
    return false;
  }

  const body = input as Record<string, unknown>;
  return (
    Array.isArray(body.projects) &&
    body.projects.every(
      (project) =>
        !!project &&
        typeof project === "object" &&
        typeof (project as Record<string, unknown>).id === "string"
    )
  );
}

export function useDefaultProject(): DefaultProjectState {
  const [state, setState] = useState<DefaultProjectState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;

    async function loadProject() {
      try {
        const response = await fetch(`${bffBaseUrl}/projects`, { credentials: "include" });
        if (!response.ok) {
          throw new Error("request_failed");
        }

        const body = await response.json();
        if (!isProjectListResponse(body) || body.projects.length === 0) {
          throw new Error("empty");
        }

        if (isActive) {
          setState({ status: "ready", projectId: body.projects[0]!.id });
        }
      } catch {
        if (isActive) {
          setState({ status: "error", error: "Could not load your projects." });
        }
      }
    }

    void loadProject();

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
