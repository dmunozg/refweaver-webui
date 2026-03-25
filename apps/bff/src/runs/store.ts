import { and, desc, eq } from "drizzle-orm";
import { analysisRuns } from "@refweaver/db";
import type { Database } from "@refweaver/db";
import {
  TERMINAL_RUN_STATUSES,
  type RunCreateInput,
  type RunRecord,
  type RunStore,
  type RunStatusGroup
} from "./types";

function castRuns(rows: Array<Record<string, unknown>>): RunRecord[] {
  return rows as RunRecord[];
}

function filterRunsByStatusGroup(runs: RunRecord[], statusGroup: RunStatusGroup): RunRecord[] {
  if (statusGroup === "all") {
    return runs;
  }

  if (statusGroup === "terminal") {
    return runs.filter((run) => TERMINAL_RUN_STATUSES.includes(run.status as (typeof TERMINAL_RUN_STATUSES)[number]));
  }

  return runs.filter((run) => !TERMINAL_RUN_STATUSES.includes(run.status as (typeof TERMINAL_RUN_STATUSES)[number]));
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
      const rows = castRuns(
        await db
          .select()
          .from(analysisRuns)
          .where(and(eq(analysisRuns.userId, userId), eq(analysisRuns.projectId, projectId)))
          .orderBy(desc(analysisRuns.createdAt))
      );

      const filtered = filterRunsByStatusGroup(rows, pagination?.statusGroup ?? "all");
      if (!pagination) {
        return filtered;
      }

      return filtered.slice(pagination.offset, pagination.offset + pagination.limit);
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
