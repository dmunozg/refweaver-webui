import { useEffect, useState } from "react";
import { formatRunTitle, listRuns } from "./api";
import { formatAnalysisStatus } from "./polling";
import type { AnalysisRunRecord } from "./types";
import { useDefaultProject } from "../projects/use-default-project";

type AnalysisListState =
  | { status: "loading"; runs: AnalysisRunRecord[]; page: number; hasNext: boolean; hasPrevious: boolean; error: string | null }
  | { status: "ready"; runs: AnalysisRunRecord[]; page: number; hasNext: boolean; hasPrevious: boolean; error: string | null }
  | { status: "error"; runs: AnalysisRunRecord[]; page: number; hasNext: boolean; hasPrevious: boolean; error: string | null };

type AnalysisListViewProps = {
  onRunSelect?: (runId: string) => void;
};

const pageSize = 10;

function statusTone(status: string) {
  const displayStatus = formatAnalysisStatus(status);
  return displayStatus === "failed" || displayStatus === "error" ? "red" : "green";
}

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString();
}

export function AnalysisListView({ onRunSelect }: AnalysisListViewProps) {
  const project = useDefaultProject();
  const [page, setPage] = useState(1);
  const projectId = project.status === "ready" ? project.projectId : null;
  const projectError = project.status === "error" ? project.error : null;
  const [state, setState] = useState<AnalysisListState>({
    status: "loading",
    runs: [],
    page: 1,
    hasNext: false,
    hasPrevious: false,
    error: null
  });

  useEffect(() => {
    let isActive = true;

    if (project.status === "error") {
      setState({ status: "error", runs: [], page, hasNext: false, hasPrevious: false, error: projectError });
      return () => {
        isActive = false;
      };
    }

    if (project.status !== "ready") {
      setState({ status: "loading", runs: [], page, hasNext: false, hasPrevious: false, error: null });
      return () => {
        isActive = false;
      };
    }

    setState((current) => ({ ...current, status: "loading", page, error: null }));

    async function loadRuns() {
      try {
        const response = await listRuns(projectId!, { page, pageSize });
        if (!isActive) {
          return;
        }

        setState({
          status: "ready",
          runs: response.runs,
          page: response.pagination.page,
          hasNext: response.pagination.hasNext,
          hasPrevious: response.pagination.hasPrevious,
          error: null
        });
      } catch {
        if (isActive) {
          setState({
            status: "error",
            runs: [],
            page,
            hasNext: false,
            hasPrevious: false,
            error: "Could not load analysis runs."
          });
        }
      }
    }

    void loadRuns();

    return () => {
      isActive = false;
    };
  }, [page, project.status, projectId, projectError]);

  const isLoading = project.status === "loading" || state.status === "loading";

  return (
    <section>
      <h1>Analysis list</h1>
      {isLoading ? <p>Loading analyses...</p> : null}
      {project.status === "error" || state.status === "error" ? <p>{project.status === "error" ? project.error : state.error}</p> : null}

      <p>{`Page ${state.page}`}</p>

      {state.runs.length > 0 ? (
        <ul>
          {state.runs.map((run) => (
            <li key={run.id}>
              <span aria-label={`Status: ${formatAnalysisStatus(run.status)}`} style={{ color: statusTone(run.status) }}>
                ●
              </span>{" "}
              {onRunSelect ? (
                <button type="button" onClick={() => onRunSelect(run.id)}>
                  <strong>{formatRunTitle(run.title)}</strong>
                </button>
              ) : (
                <strong>{formatRunTitle(run.title)}</strong>
              )}
              <time dateTime={run.createdAt}>{formatCreatedAt(run.createdAt)}</time>
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={!state.hasPrevious || isLoading}>
          Previous
        </button>
        <button type="button" onClick={() => setPage((current) => current + 1)} disabled={!state.hasNext || isLoading}>
          Next
        </button>
      </div>
    </section>
  );
}
