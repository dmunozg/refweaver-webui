import type { JobResponse, RunResponse } from "../refweaver/types";
import type { ProjectRecord } from "../projects/types";

export type RunRecord = {
  id: string;
  projectId: string;
  userId: string;
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
  text: string;
  status: string;
  refweaverRunId: string | null;
  refweaverJobId: string | null;
};

export type RunStore = {
  createRun(input: RunCreateInput): Promise<RunRecord>;
  listRuns(userId: string, projectId: string): Promise<RunRecord[]>;
  getRunById(userId: string, projectId: string, runId: string): Promise<RunRecord | null>;
  getRunByJobId(userId: string, projectId: string, jobId: string): Promise<RunRecord | null>;
  updateRunStatus(
    id: string,
    status: string,
    refweaverRunId?: string | null
  ): Promise<RunRecord | null>;
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
