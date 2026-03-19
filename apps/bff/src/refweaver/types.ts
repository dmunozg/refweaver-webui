export type AnalyzeRequest = {
  text: string;
  includeMarkdown?: boolean;
};

export type AnalyzeResponse = {
  runId: string;
  status: string;
  jobId: string;
  jobUrl: string;
};

export type JobResponse = {
  status: string;
  jobId: string;
  userId: string;
  runId?: string;
  runUrl?: string;
};

export type RunResponse = {
  run: unknown;
  sentences: unknown[];
  verdicts: Record<string, unknown>;
  evaluations: unknown[];
  report?: string;
};
