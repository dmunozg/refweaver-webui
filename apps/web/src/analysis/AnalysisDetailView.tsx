import { useEffect, useState } from "react";
import { AnalysisClientError, formatRunTitle, getRun } from "./api";
import { formatAnalysisStatus, getPollingDelayMs, isTerminalRunStatus, pollAnalysisRun } from "./polling";
import type { AnalysisRunResponse } from "./types";
import { useDefaultProject } from "../projects/use-default-project";

type AnalysisDetailViewProps = {
  runId: string;
  onCreateNewAnalysis?: () => void;
};

type DetailState =
  | { status: "loading" }
  | { status: "ready"; response: AnalysisRunResponse }
  | { status: "missing" }
  | { status: "error"; error: string };

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString();
}

function getRunStatusLabel(status: string) {
  if (isTerminalRunStatus(status)) {
    return `Terminal state: ${status}`;
  }

  return `In progress: ${status}`;
}

export function AnalysisDetailView({ runId, onCreateNewAnalysis }: AnalysisDetailViewProps) {
  const project = useDefaultProject();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const projectId = project.status === "ready" ? project.projectId : null;
  const projectError = project.status === "error" ? project.error : null;

  useEffect(() => {
    let isActive = true;
    let timeoutId: number | null = null;
    let pollAttempt = 0;

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

        setState({ status: "ready", response });
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

  const run = state.status === "ready" ? state.response.run : null;
  const upstreamRun = state.status === "ready" ? state.response.upstreamRun : null;
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
    let timeoutId: number | null = null;
    let pollAttempt = 0;

    async function pollRun() {
      try {
        const nextRun = await pollAnalysisRun(projectId!, currentRun);
        if (isActive) {
          if (nextRun.status === "finished") {
            const refreshed = await getRun(projectId!, runId);
            if (isActive) {
              setState({ status: "ready", response: refreshed });
            }
            return;
          }

          setState({
            status: "ready",
            response: {
              run: nextRun
            }
          });
          pollAttempt += 1;
          timeoutId = globalThis.setTimeout(() => {
            void pollRun();
          }, getPollingDelayMs(pollAttempt));
        }
      } catch {
        // Keep the last loaded run visible.
        pollAttempt += 1;
        timeoutId = globalThis.setTimeout(() => {
          void pollRun();
        }, getPollingDelayMs(pollAttempt));
      }
    }

    void pollRun();

    return () => {
      isActive = false;
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [project.status, projectId, runStatus, runId]);

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
        <p>Status: failed</p>
        <button type="button" onClick={onCreateNewAnalysis ?? (() => {})}>
          New analysis
        </button>
      </section>
    );
  }

  return (
    <section>
      <h1>Analysis detail</h1>
      <p>{getRunStatusLabel(formatAnalysisStatus(state.response.run.status))}</p>
      <dl>
        <div>
          <dt>Title</dt>
          <dd>{formatRunTitle(state.response.run.title)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{formatAnalysisStatus(state.response.run.status)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={state.response.run.createdAt}>{formatCreatedAt(state.response.run.createdAt)}</time>
          </dd>
        </div>
      </dl>
      {upstreamRun ? (
        <section>
          <h2>Upstream payload</h2>
          <pre>{JSON.stringify(upstreamRun, null, 2)}</pre>
        </section>
      ) : null}
      {isTerminalRunStatus(state.response.run.status) ? (
        <button type="button" onClick={onCreateNewAnalysis ?? (() => {})}>
          New analysis
        </button>
      ) : null}
    </section>
  );
}
