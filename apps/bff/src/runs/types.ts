import type { JobResponse, RunResponse } from "../refweaver/types";
import type { ProjectRecord } from "../projects/types";

export type RunStatusGroup = "all" | "terminal" | "in_progress";

export const TERMINAL_RUN_STATUSES = ["finished", "failed", "missing"] as const;

export type RunRecord = {
  id: string;
  projectId: string;
  userId: string;
  title: string | null;
  inputText: string;
  status: string;
  refweaverRunId: string | null;
  refweaverJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RunCreateInput = {
  projectId: string;
  userId: string;
  title: string | null;
  text: string;
  status: string;
  refweaverRunId: string | null;
  refweaverJobId: string | null;
};

export type RunStore = {
  createRun(input: RunCreateInput): Promise<RunRecord>;
  listRuns(
    userId: string,
    projectId: string,
    pagination?: { limit: number; offset: number; statusGroup?: RunStatusGroup }
  ): Promise<RunRecord[]>;
  getRunById(userId: string, projectId: string, runId: string): Promise<RunRecord | null>;
  getRunByJobId(userId: string, projectId: string, jobId: string): Promise<RunRecord | null>;
  updateRunStatus(
    id: string,
    status: string,
    refweaverRunId?: string | null
  ): Promise<RunRecord | null>;
};

export type RunDetailResponse = {
  run: RunRecord;
  upstreamRun?: RunResponse;
};

export type RefweaverClient = {
  analyze(
    userId: string,
    input: {
      text: string;
      includeMarkdown?: boolean;
    }
  ): Promise<{
    runId: string;
    status: string;
    jobId: string;
    jobUrl: string;
  }>;
  getJob(userId: string, jobId: string): Promise<JobResponse>;
  getRun(userId: string, runId: string): Promise<RunResponse>;
};

export type ProjectLookup = {
  getProject(ownerUserId: string, projectId: string): Promise<ProjectRecord>;
};
