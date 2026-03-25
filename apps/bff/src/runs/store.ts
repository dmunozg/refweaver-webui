import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { analysisRuns } from "@refweaver/db";
import type { Database } from "@refweaver/db";
import {
  TERMINAL_RUN_STATUSES,
  type RunCreateInput,
  type RunRecord,
  type RunStore,
  type RunStatusGroup
} from "./types";

const TERMINAL_RUN_STATUS_SET = new Set<string>(TERMINAL_RUN_STATUSES);

function castRuns(rows: Array<Record<string, unknown>>): RunRecord[] {
  return rows as RunRecord[];
}

function isTerminalRunStatus(status: string): boolean {
  return TERMINAL_RUN_STATUS_SET.has(status);
}

function buildStatusGroupCondition(statusGroup: RunStatusGroup) {
  if (statusGroup === "terminal") {
    return inArray(analysisRuns.status, [...TERMINAL_RUN_STATUSES]);
  }

  if (statusGroup === "in_progress") {
    return notInArray(analysisRuns.status, [...TERMINAL_RUN_STATUSES]);
  }

  return undefined;
}

function filterRunsByStatusGroup(runs: RunRecord[], statusGroup: RunStatusGroup): RunRecord[] {
  if (statusGroup === "terminal") {
    return runs.filter((run) => isTerminalRunStatus(run.status));
  }

  if (statusGroup === "in_progress") {
    return runs.filter((run) => !isTerminalRunStatus(run.status));
  }

  return runs;
}

export function createRunStore(db: Database): RunStore {
  return {
    async createRun(input: RunCreateInput) {
      const [row] = castRuns(
        await db
          .insert(analysisRuns)
          .values({
            projectId: input.projectId,
            userId: input.userId,
            title: input.title,
            inputText: input.text,
            status: input.status,
            refweaverRunId: input.refweaverRunId,
            refweaverJobId: input.refweaverJobId
          })
          .returning()
      );
      return row;
    },

    async listRuns(
      userId: string,
      projectId: string,
      pagination?: { limit: number; offset: number; statusGroup?: RunStatusGroup }
    ) {
      const statusCondition = buildStatusGroupCondition(pagination?.statusGroup ?? "all");
      const whereCondition = statusCondition
        ? and(eq(analysisRuns.userId, userId), eq(analysisRuns.projectId, projectId), statusCondition)
        : and(eq(analysisRuns.userId, userId), eq(analysisRuns.projectId, projectId));

      const query = db.select().from(analysisRuns).where(whereCondition).orderBy(desc(analysisRuns.createdAt));
      const rows = pagination ? await query.limit(pagination.limit).offset(pagination.offset) : await query;

      return filterRunsByStatusGroup(castRuns(rows), pagination?.statusGroup ?? "all");
    },

    async getRunById(userId: string, projectId: string, runId: string) {
      const [row] = castRuns(
        await db
          .select()
          .from(analysisRuns)
          .where(
            and(
              eq(analysisRuns.userId, userId),
              eq(analysisRuns.projectId, projectId),
              eq(analysisRuns.id, runId)
            )
          )
          .limit(1)
      );

      return row ?? null;
    },

    async getRunByJobId(userId: string, projectId: string, jobId: string) {
      const [row] = castRuns(
        await db
          .select()
          .from(analysisRuns)
          .where(
            and(
              eq(analysisRuns.userId, userId),
              eq(analysisRuns.projectId, projectId),
              eq(analysisRuns.refweaverJobId, jobId)
            )
          )
          .limit(1)
      );

      return row ?? null;
    },

    async updateRunStatus(id: string, status: string, refweaverRunId?: string | null) {
      const updateValues: { status: string; updatedAt: Date; refweaverRunId?: string | null } = {
        status,
        updatedAt: new Date()
      };
      if (refweaverRunId !== undefined) {
        updateValues.refweaverRunId = refweaverRunId;
      }

      const [row] = castRuns(
        await db.update(analysisRuns).set(updateValues).where(eq(analysisRuns.id, id)).returning()
      );

      return row ?? null;
    }
  };
}
