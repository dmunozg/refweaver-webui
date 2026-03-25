import { useEffect, useMemo, useRef, useState } from "react";
import { formatRunTitle, listRuns } from "./api";
import { isTerminalRunStatus, pollAnalysisRun } from "./polling";
import type { AnalysisRunRecord } from "./types";
import { useDefaultProject } from "../projects/use-default-project";

type DashboardViewProps = {
  onCreateNewAnalysis?: () => void;
};

type DashboardRunsState =
  | { status: "loading"; runs: AnalysisRunRecord[]; error: string | null }
  | { status: "ready"; runs: AnalysisRunRecord[]; error: string | null }
  | { status: "error"; runs: AnalysisRunRecord[]; error: string | null };

const terminalLimit = 5;
const pageSize = 50;
const pollIntervalMs = 5000;

function sortRunsNewestFirst(runs: AnalysisRunRecord[]): AnalysisRunRecord[] {
  return [...runs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function splitRuns(runs: AnalysisRunRecord[]) {
  const orderedRuns = sortRunsNewestFirst(runs);
  const inProgressRuns = orderedRuns.filter((run) => !isTerminalRunStatus(run.status));
  const terminalRuns = orderedRuns.filter((run) => isTerminalRunStatus(run.status)).slice(0, terminalLimit);

  return { inProgressRuns, terminalRuns };
}

function DashboardRunList({ runs }: { runs: AnalysisRunRecord[] }) {
  return (
    <ul>
      {runs.map((run) => (
        <li key={run.id}>
          <strong>{formatRunTitle(run.title)}</strong>
          <div>Status: {run.status}</div>
        </li>
      ))}
    </ul>
  );
}

export function DashboardView({ onCreateNewAnalysis }: DashboardViewProps) {
  const project = useDefaultProject();
  const [runsState, setRunsState] = useState<DashboardRunsState>({ status: "loading", runs: [], error: null });
  const runsRef = useRef<AnalysisRunRecord[]>([]);
  const projectId = project.status === "ready" ? project.projectId : null;
  const projectError = project.status === "error" ? project.error : null;

  useEffect(() => {
    runsRef.current = runsState.runs;
  }, [runsState.runs]);

  useEffect(() => {
    let isActive = true;

    if (project.status === "error") {
      setRunsState({ status: "error", runs: [], error: projectError });
      return () => {
        isActive = false;
      };
    }

    if (project.status !== "ready") {
      setRunsState({ status: "loading", runs: [], error: null });
      return () => {
        isActive = false;
      };
    }

    if (!projectId) {
      return () => {
        isActive = false;
      };
    }

    setRunsState({ status: "loading", runs: [], error: null });

    async function loadRuns() {
      try {
        const response = await listRuns(projectId!, { page: 1, pageSize });
        if (!isActive) {
          return;
        }

        setRunsState({ status: "ready", runs: sortRunsNewestFirst(response.runs), error: null });
      } catch {
        if (isActive) {
          setRunsState({ status: "error", runs: [], error: "Could not load analysis runs." });
        }
      }
    }

    void loadRuns();

    return () => {
      isActive = false;
    };
  }, [project.status, projectId, projectError]);

  useEffect(() => {
    if (project.status !== "ready" || runsState.status !== "ready") {
      return;
    }

    if (!projectId) {
      return;
    }

    let isActive = true;

    async function pollRuns() {
      const inProgressRuns = runsRef.current.filter((run) => !isTerminalRunStatus(run.status));
      if (inProgressRuns.length === 0) {
        return;
      }

      try {
        const updates = await Promise.all(inProgressRuns.map((run) => pollAnalysisRun(projectId!, run)));
        if (!isActive) {
          return;
        }

        const updatesById = new Map(updates.map((run) => [run.id, run]));
        setRunsState((current) => {
          if (current.status !== "ready") {
            return current;
          }

          return {
            ...current,
            runs: current.runs.map((run) => updatesById.get(run.id) ?? run)
          };
        });
      } catch {
        // Keep the current list visible if polling fails.
      }
    }

    void pollRuns();
    const intervalId = globalThis.setInterval(() => {
      void pollRuns();
    }, pollIntervalMs);

    return () => {
      isActive = false;
      globalThis.clearInterval(intervalId);
    };
  }, [project.status, projectId, runsState.status]);

  const sections = useMemo(() => {
    if (runsState.status !== "ready") {
      return { inProgressRuns: [], terminalRuns: [] };
    }

    return splitRuns(runsState.runs);
  }, [runsState]);

  const handleCreateNewAnalysis = onCreateNewAnalysis ?? (() => {});

  return (
    <section>
      <h1>Dashboard</h1>
      <button type="button" onClick={handleCreateNewAnalysis}>
        Start a new analysis
      </button>

      {project.status === "loading" || runsState.status === "loading" ? <p>Loading analyses...</p> : null}
      {projectError || runsState.status === "error" ? <p>{projectError ?? runsState.error}</p> : null}

      {sections.inProgressRuns.length > 0 ? (
        <section>
          <h2>In progress</h2>
          <DashboardRunList runs={sections.inProgressRuns} />
        </section>
      ) : null}

      {sections.terminalRuns.length > 0 ? (
        <section>
          <h2>Past analyses</h2>
          <DashboardRunList runs={sections.terminalRuns} />
        </section>
      ) : null}
    </section>
  );
}
