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

export type AnalysisRunResponse = {
  run: AnalysisRunRecord;
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
  run: AnalysisRunRecord;
};

export type CreateAnalysisRunInput = {
  text: string;
  title?: string | null;
};

export type ListAnalysisRunsInput = {
  page?: number;
  pageSize?: number;
  statusGroup?: string;
};
