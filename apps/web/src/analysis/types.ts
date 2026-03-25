export type AnalysisRunRecord = {
  id: string;
  projectId: string;
  userId: string;
  title: string | null;
  inputText: string;
  status: string;
  refweaverRunId: string | null;
  refweaverJobId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnalysisUpstreamRunPayload = {
  run: Record<string, unknown>;
  sentences: unknown[];
  verdicts: Record<string, unknown>;
  evaluations: unknown[];
  report?: string;
};

export type AnalysisRunDetails = AnalysisRunRecord & {
  upstreamRun?: AnalysisUpstreamRunPayload;
};

export type AnalysisRunResponse = {
  run: AnalysisRunDetails;
  upstreamRun?: AnalysisUpstreamRunPayload;
};

export type AnalysisPagination = {
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type AnalysisRunListResponse = {
  runs: AnalysisRunRecord[];
  pagination: AnalysisPagination;
};

export type AnalysisJobPollResponse = {
  status: string;
  jobId: string;
  userId: string;
  runId?: string;
  runUrl?: string;
};

export type CreateAnalysisRunInput = {
  text: string;
  title?: string | null;
};

export type ListAnalysisRunsInput = {
  page?: number;
  pageSize?: number;
};
