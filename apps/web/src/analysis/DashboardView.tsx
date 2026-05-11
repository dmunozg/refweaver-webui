import { useEffect, useMemo, useRef, useState } from "react";
import { formatRunTitle, listRuns } from "./api";
import { formatAnalysisStatus, getPollingDelayMs, isTerminalRunStatus, pollAnalysisRun } from "./polling";
import type { AnalysisRunRecord } from "./types";
import { useDefaultProject } from "../projects/use-default-project";

type DashboardViewProps = {
  onCreateNewAnalysis?: () => void;
  onViewAllAnalyses?: () => void;
};

type DashboardRunsState =
  | { status: "loading"; runs: AnalysisRunRecord[]; error: string | null }
  | { status: "ready"; runs: AnalysisRunRecord[]; error: string | null }
  | { status: "error"; runs: AnalysisRunRecord[]; error: string | null };

const terminalLimit = 5;
const pageSize = 50;

function sortRunsNewestFirst(runs: AnalysisRunRecord[]): AnalysisRunRecord[] {
  return [...runs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function splitRuns(runs: AnalysisRunRecord[]) {
  const orderedRuns = sortRunsNewestFirst(runs);
  const inProgressRuns = orderedRuns.filter((run) => !isTerminalRunStatus(run.status));

  return { inProgressRuns };
}

function selectTerminalRuns(runs: AnalysisRunRecord[]) {
  return sortRunsNewestFirst(runs)
    .filter((run) => isTerminalRunStatus(run.status))
    .slice(0, terminalLimit);
}

function mergeTerminalRuns(currentRuns: AnalysisRunRecord[], updates: AnalysisRunRecord[]) {
  const byId = new Map(currentRuns.map((run) => [run.id, run]));
  for (const update of updates) {
    byId.set(update.id, update);
  }

  return selectTerminalRuns(Array.from(byId.values()));
}

function DashboardRunList({ runs }: { runs: AnalysisRunRecord[] }) {
  return (
    <ul>
      {runs.map((run) => (
        <li key={run.id}>
          <strong>{formatRunTitle(run.title)}</strong>
          <div>Status: {formatAnalysisStatus(run.status)}</div>
        </li>
      ))}
    </ul>
  );
}

export function DashboardView({ onCreateNewAnalysis, onViewAllAnalyses }: DashboardViewProps) {
  const project = useDefaultProject();
  const [inProgressRunsState, setInProgressRunsState] = useState<DashboardRunsState>({ status: "loading", runs: [], error: null });
  const [terminalRunsState, setTerminalRunsState] = useState<DashboardRunsState>({ status: "loading", runs: [], error: null });
  const inProgressRunsRef = useRef<AnalysisRunRecord[]>([]);
  const projectId = project.status === "ready" ? project.projectId : null;
  const projectError = project.status === "error" ? project.error : null;

  useEffect(() => {
    inProgressRunsRef.current = inProgressRunsState.runs;
  }, [inProgressRunsState.runs]);

  useEffect(() => {
    let isActive = true;

    if (project.status === "error") {
      setInProgressRunsState({ status: "error", runs: [], error: projectError });
      setTerminalRunsState({ status: "error", runs: [], error: projectError });
      return () => {
        isActive = false;
      };
    }

    if (project.status !== "ready") {
      setInProgressRunsState({ status: "loading", runs: [], error: null });
      setTerminalRunsState({ status: "loading", runs: [], error: null });
      return () => {
        isActive = false;
      };
    }

    if (!projectId) {
      return () => {
        isActive = false;
      };
    }

    setInProgressRunsState({ status: "loading", runs: [], error: null });
    setTerminalRunsState({ status: "loading", runs: [], error: null });

    async function loadInProgressRuns() {
      try {
        const response = await listRuns(projectId!, { page: 1, pageSize, statusGroup: "in_progress" });
        if (!isActive) {
          return;
        }

        setInProgressRunsState({ status: "ready", runs: sortRunsNewestFirst(response.runs), error: null });
      } catch {
        if (isActive) {
          setInProgressRunsState({ status: "error", runs: [], error: "Could not load analysis runs." });
        }
      }
    }

    async function loadTerminalRuns() {
      try {
        const response = await listRuns(projectId!, { page: 1, pageSize: terminalLimit, statusGroup: "terminal" });
        if (!isActive) {
          return;
        }

        setTerminalRunsState((current) => {
          const nextRuns = selectTerminalRuns(response.runs);

          if (current.status !== "ready") {
            return { status: "ready", runs: nextRuns, error: null };
          }

          return { ...current, runs: mergeTerminalRuns(current.runs, nextRuns) };
        });
      } catch {
        if (isActive) {
          setTerminalRunsState({ status: "error", runs: [], error: "Could not load analysis runs." });
        }
      }
    }

    void loadInProgressRuns();
    void loadTerminalRuns();

    return () => {
      isActive = false;
    };
  }, [project.status, projectId, projectError]);

  useEffect(() => {
    if (project.status !== "ready" || inProgressRunsState.status !== "ready") {
      return;
    }

    if (!projectId) {
      return;
    }

    let isActive = true;
    let timeoutId: number | null = null;
    let pollAttempt = 0;

    async function pollRuns() {
      const inProgressRuns = inProgressRunsRef.current.filter((run) => !isTerminalRunStatus(run.status));
      if (inProgressRuns.length === 0) {
        return;
      }

      try {
        const updates = await Promise.all(inProgressRuns.map((run) => pollAnalysisRun(projectId!, run)));
        if (!isActive) {
          return;
        }

        const updatesById = new Map(updates.map((run) => [run.id, run]));
        setInProgressRunsState((current) => {
          if (current.status !== "ready") {
            return current;
          }

          return { ...current, runs: current.runs.map((run) => updatesById.get(run.id) ?? run) };
        });
        setTerminalRunsState((current) => {
          if (current.status !== "ready") {
            return current;
          }

          return { ...current, runs: mergeTerminalRuns(current.runs, updates) };
        });

        pollAttempt += 1;
        timeoutId = globalThis.setTimeout(() => {
          void pollRuns();
        }, getPollingDelayMs(pollAttempt));
      } catch {
        // Keep the current list visible if polling fails.
        pollAttempt += 1;
        timeoutId = globalThis.setTimeout(() => {
          void pollRuns();
        }, getPollingDelayMs(pollAttempt));
      }
    }

    void pollRuns();

    return () => {
      isActive = false;
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [project.status, projectId, inProgressRunsState.status]);

  const sections = useMemo(() => {
    return {
      inProgressRuns: inProgressRunsState.status === "ready" ? splitRuns(inProgressRunsState.runs).inProgressRuns : [],
      terminalRuns: terminalRunsState.status === "ready" ? terminalRunsState.runs : []
    };
  }, [inProgressRunsState, terminalRunsState]);

  const handleCreateNewAnalysis = onCreateNewAnalysis ?? (() => {});
  const handleViewAllAnalyses = onViewAllAnalyses ?? (() => {});

  return (
    <section>
      <h1>Dashboard</h1>
      <button type="button" onClick={handleCreateNewAnalysis}>
        Start a new analysis
      </button>
      <button type="button" onClick={handleViewAllAnalyses}>
        View all
      </button>

      {project.status === "loading" || inProgressRunsState.status === "loading" || terminalRunsState.status === "loading" ? (
        <p>Loading analyses...</p>
      ) : null}
      {projectError || inProgressRunsState.status === "error" || terminalRunsState.status === "error" ? (
        <p>{projectError ?? inProgressRunsState.error ?? terminalRunsState.error}</p>
      ) : null}

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
