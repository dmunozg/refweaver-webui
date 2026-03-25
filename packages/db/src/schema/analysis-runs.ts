import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inputText: text("input_text").notNull(),
    title: text("title"),
    status: text("status").notNull(),
    refweaverRunId: text("refweaver_run_id"),
    refweaverJobId: text("refweaver_job_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("analysis_runs_project_created_idx").on(table.projectId, table.createdAt),
    index("analysis_runs_user_created_idx").on(table.userId, table.createdAt),
    uniqueIndex("analysis_runs_user_job_unique_idx")
      .on(table.userId, table.refweaverJobId)
      .where(sql`${table.refweaverJobId} is not null`)
  ]
);
