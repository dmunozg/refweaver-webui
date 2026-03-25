import { AnalysisClientError, pollJob } from "./api";
import type { AnalysisRunRecord } from "./types";

const terminalStatuses = new Set(["finished", "failed", "missing"]);

export function isTerminalRunStatus(status: string): boolean {
  return terminalStatuses.has(status);
}

export function formatAnalysisStatus(status: string): string {
  return status === "missing" ? "failed" : status;
}

export function getPollingDelayMs(attempt: number): number {
  return attempt < 3 ? 1000 : 2000;
}

export async function pollAnalysisRun(projectId: string, run: AnalysisRunRecord): Promise<AnalysisRunRecord> {
  if (!run.refweaverJobId || isTerminalRunStatus(run.status)) {
    return run;
  }

  try {
    const response = await pollJob(projectId, run.refweaverJobId);
    return { ...run, status: response.status };
  } catch (error) {
    if (error instanceof AnalysisClientError && error.code === "not_found") {
      return { ...run, status: "missing" };
    }

    throw error;
  }
}
