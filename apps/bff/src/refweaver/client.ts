import { RefweaverHttpError, RefweaverNetworkError } from "./errors";
import type { AnalyzeRequest, AnalyzeResponse, JobResponse, RunResponse } from "./types";

type ClientConfig = {
  baseUrl: string;
  apiKey?: string;
};

type ErrorEnvelope = {
  error_code?: string;
  message?: string;
  details?: Record<string, string> | null;
};

type ErrorWrapper = {
  detail?: ErrorEnvelope;
} & ErrorEnvelope;

function normalizeError(status: number, payload: unknown): RefweaverHttpError {
  const body = (payload ?? {}) as ErrorWrapper;
  const detail = body.detail ?? body;
  const code = detail.error_code ?? `http_${status}`;
  const message = detail.message ?? `RefWeaver request failed with status ${status}`;
  const details = detail.details ?? null;
  return new RefweaverHttpError(status, code, message, details);
}

function buildHeaders(userId: string, apiKey?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-User-Id": userId,
    ...(apiKey ? { "X-API-Key": apiKey } : {})
  };
}

export function createRefweaverClient(config: ClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...buildHeaders(userId, config.apiKey),
          ...(init?.headers ?? {})
        }
      });
    } catch (error) {
      throw new RefweaverNetworkError(
        error instanceof Error ? error.message : "Unable to reach RefWeaver"
      );
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw normalizeError(response.status, payload);
    }

    return payload as T;
  }

  return {
    async analyze(userId: string, input: AnalyzeRequest): Promise<AnalyzeResponse> {
      const payload = await request<{
        run_id: string;
        status: string;
        job_id: string;
        job_url: string;
      }>("/analyze", userId, {
        method: "POST",
        body: JSON.stringify({
          text: input.text,
          include_markdown: input.includeMarkdown ?? true
        })
      });

      return {
        runId: payload.run_id,
        status: payload.status,
        jobId: payload.job_id,
        jobUrl: payload.job_url
      };
    },

    async getJob(userId: string, jobId: string): Promise<JobResponse> {
      const payload = await request<{
        status: string;
        job_id: string;
        user_id: string;
        run_id?: string;
        run_url?: string;
      }>(`/jobs/${encodeURIComponent(jobId)}`, userId);

      return {
        status: payload.status,
        jobId: payload.job_id,
        userId: payload.user_id,
        runId: payload.run_id,
        runUrl: payload.run_url
      };
    },

    async getRun(userId: string, runId: string): Promise<RunResponse> {
      const payload = await request<RunResponse>(`/runs/${encodeURIComponent(runId)}`, userId);
      return payload;
    }
  };
}

export { RefweaverHttpError, RefweaverNetworkError };
