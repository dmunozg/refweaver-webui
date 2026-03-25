import { useEffect, useState } from "react";
import { AnalysisClientError, formatRunTitle, getRun } from "./api";
import { isTerminalRunStatus, pollAnalysisRun } from "./polling";
import type { AnalysisRunRecord } from "./types";
import { useDefaultProject } from "../projects/use-default-project";

type AnalysisDetailViewProps = {
  runId: string;
};

type DetailState =
  | { status: "loading" }
  | { status: "ready"; run: AnalysisRunRecord }
  | { status: "missing" }
  | { status: "error"; error: string };

const pollIntervalMs = 1000;

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString();
}

function getRunStatusLabel(status: string) {
  if (isTerminalRunStatus(status)) {
    return `Terminal state: ${status}`;
  }

  return `In progress: ${status}`;
}

export function AnalysisDetailView({ runId }: AnalysisDetailViewProps) {
  const project = useDefaultProject();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const projectId = project.status === "ready" ? project.projectId : null;
  const projectError = project.status === "error" ? project.error : null;

  useEffect(() => {
    let isActive = true;

    if (project.status === "error") {
      setState({ status: "error", error: projectError ?? "Could not load your projects." });
      return () => {
        isActive = false;
      };
    }

    if (project.status !== "ready") {
      setState({ status: "loading" });
      return () => {
        isActive = false;
      };
    }

    setState({ status: "loading" });

    async function loadRun() {
      try {
        const response = await getRun(projectId!, runId);
        if (!isActive) {
          return;
        }

        setState({ status: "ready", run: response.run });
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof AnalysisClientError && error.code === "not_found") {
          setState({ status: "missing" });
          return;
        }

        setState({ status: "error", error: "Could not load analysis run." });
      }
    }

    void loadRun();

    return () => {
      isActive = false;
    };
  }, [project.status, projectId, projectError, runId]);

  const run = state.status === "ready" ? state.run : null;
  const runStatus = run?.status ?? null;

  useEffect(() => {
    if (project.status !== "ready" || !run || isTerminalRunStatus(run.status)) {
      return;
    }

    const currentRun = run;

    if (!projectId) {
      return;
    }

    let isActive = true;

    async function pollRun() {
      try {
        const nextRun = await pollAnalysisRun(projectId!, currentRun);
        if (isActive) {
          setState({ status: "ready", run: nextRun });
        }
      } catch {
        // Keep the last loaded run visible.
      }
    }

    void pollRun();
    const intervalId = globalThis.setInterval(() => {
      void pollRun();
    }, pollIntervalMs);

    return () => {
      isActive = false;
      globalThis.clearInterval(intervalId);
    };
  }, [project.status, projectId, runStatus]);

  if (state.status === "loading") {
    return (
      <section>
        <h1>Analysis detail</h1>
        <p>Loading analysis run...</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section>
        <h1>Analysis detail</h1>
        <p>{state.error}</p>
      </section>
    );
  }

  if (state.status === "missing") {
    return (
      <section>
        <h1>Analysis detail</h1>
        <p>Analysis run not found.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Analysis detail</h1>
      <p>{getRunStatusLabel(state.run.status)}</p>
      <dl>
        <div>
          <dt>Title</dt>
          <dd>{formatRunTitle(state.run.title)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{state.run.status}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={state.run.createdAt}>{formatCreatedAt(state.run.createdAt)}</time>
          </dd>
        </div>
      </dl>
    </section>
  );
}
