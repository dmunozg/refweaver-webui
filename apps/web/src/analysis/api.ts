import { getWebConfig } from "../config";
import type {
  AnalysisJobPollResponse,
  AnalysisPagination,
  AnalysisRunListResponse,
  AnalysisRunRecord,
  AnalysisRunResponse,
  CreateAnalysisRunInput,
  ListAnalysisRunsInput
} from "./types";

export type AnalysisErrorCode = "unauthorized" | "not_found" | "network_error" | "server_error" | "unknown";

export class AnalysisClientError extends Error {
  constructor(public readonly code: AnalysisErrorCode) {
    super(code);
    this.name = "AnalysisClientError";
  }
}

const { bffBaseUrl } = getWebConfig();

function isRecord(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === "object";
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isRunRecord(input: unknown): input is AnalysisRunRecord {
  if (!isRecord(input)) {
    return false;
  }

  return (
    typeof input.id === "string" &&
    typeof input.projectId === "string" &&
    typeof input.userId === "string" &&
    isStringOrNull(input.title) &&
    typeof input.inputText === "string" &&
    typeof input.status === "string" &&
    isStringOrNull(input.refweaverRunId) &&
    isStringOrNull(input.refweaverJobId) &&
    typeof input.createdAt === "string" &&
    typeof input.updatedAt === "string"
  );
}

function parseRunResponse(input: unknown): AnalysisRunResponse {
  if (!isRecord(input) || !isRunRecord(input.run)) {
    throw new AnalysisClientError("unknown");
  }

  return { run: input.run };
}

function parsePagination(input: unknown): AnalysisPagination {
  if (!isRecord(input)) {
    throw new AnalysisClientError("unknown");
  }

  if (
    typeof input.page !== "number" ||
    typeof input.pageSize !== "number" ||
    typeof input.hasNext !== "boolean" ||
    typeof input.hasPrevious !== "boolean"
  ) {
    throw new AnalysisClientError("unknown");
  }

  return {
    page: input.page,
    pageSize: input.pageSize,
    hasNext: input.hasNext,
    hasPrevious: input.hasPrevious
  };
}

function parseRunListResponse(input: unknown): AnalysisRunListResponse {
  if (!isRecord(input) || !Array.isArray(input.runs)) {
    throw new AnalysisClientError("unknown");
  }

  const runs = input.runs;
  if (!runs.every(isRunRecord)) {
    throw new AnalysisClientError("unknown");
  }

  return {
    runs,
    pagination: parsePagination(input.pagination)
  };
}

function parseJobPollResponse(input: unknown): AnalysisJobPollResponse {
  if (!isRecord(input)) {
    throw new AnalysisClientError("unknown");
  }

  if (
    typeof input.status !== "string" ||
    typeof input.jobId !== "string" ||
    typeof input.userId !== "string" ||
    (input.runId !== undefined && typeof input.runId !== "string") ||
    (input.runUrl !== undefined && typeof input.runUrl !== "string")
  ) {
    throw new AnalysisClientError("unknown");
  }

  return {
    status: input.status,
    jobId: input.jobId,
    userId: input.userId,
    ...(input.runId === undefined ? {} : { runId: input.runId }),
    ...(input.runUrl === undefined ? {} : { runUrl: input.runUrl })
  };
}

async function readJson<T>(response: Response, parser: (input: unknown) => T): Promise<T> {
  try {
    const body = await response.json();
    return parser(body);
  } catch (error) {
    if (error instanceof AnalysisClientError) {
      throw error;
    }

    throw new AnalysisClientError("unknown");
  }
}

function normalizeStatus(response: Response): void {
  if (response.status === 401) {
    throw new AnalysisClientError("unauthorized");
  }

  if (response.status === 404) {
    throw new AnalysisClientError("not_found");
  }

  if (!response.ok) {
    throw new AnalysisClientError("server_error");
  }
}

export function formatRunTitle(title: string | null | undefined): string {
  const normalized = title?.trim();
  return normalized ? normalized : "(no title)";
}

export async function createRun(projectId: string, input: CreateAnalysisRunInput): Promise<AnalysisRunResponse> {
  let response: Response;
  try {
    response = await fetch(`${bffBaseUrl}/projects/${encodeURIComponent(projectId)}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        text: input.text,
        ...(input.title == null ? {} : { title: input.title })
      })
    });
  } catch {
    throw new AnalysisClientError("network_error");
  }

  normalizeStatus(response);
  return readJson(response, parseRunResponse);
}

export async function listRuns(
  projectId: string,
  pagination: ListAnalysisRunsInput = {}
): Promise<AnalysisRunListResponse> {
  const page = pagination.page ?? 1;
  const pageSize = pagination.pageSize ?? 10;
  let response: Response;

  try {
    response = await fetch(
      `${bffBaseUrl}/projects/${encodeURIComponent(projectId)}/runs?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`,
      { credentials: "include" }
    );
  } catch {
    throw new AnalysisClientError("network_error");
  }

  normalizeStatus(response);
  return readJson(response, parseRunListResponse);
}

export async function getRun(projectId: string, runId: string): Promise<AnalysisRunResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${bffBaseUrl}/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}`,
      { credentials: "include" }
    );
  } catch {
    throw new AnalysisClientError("network_error");
  }

  normalizeStatus(response);
  return readJson(response, parseRunResponse);
}

export async function pollJob(projectId: string, jobId: string): Promise<AnalysisJobPollResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${bffBaseUrl}/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}`,
      { credentials: "include" }
    );
  } catch {
    throw new AnalysisClientError("network_error");
  }

  normalizeStatus(response);
  return readJson(response, parseJobPollResponse);
}
