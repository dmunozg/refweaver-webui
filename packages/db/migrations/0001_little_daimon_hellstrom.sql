CREATE TABLE IF NOT EXISTS "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"input_text" text NOT NULL,
	"title" text,
	"status" text NOT NULL,
	"refweaver_run_id" text,
	"refweaver_job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_runs_project_created_idx" ON "analysis_runs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_runs_user_created_idx" ON "analysis_runs" USING btree ("user_id","created_at");--> statement-breakpoint
WITH ranked_runs AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, refweaver_job_id
      ORDER BY created_at ASC, id ASC
    ) AS row_rank
  FROM analysis_runs
  WHERE refweaver_job_id IS NOT NULL
)
UPDATE analysis_runs
SET refweaver_job_id = NULL,
    updated_at = now()
WHERE id IN (
  SELECT id
  FROM ranked_runs
  WHERE row_rank > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "analysis_runs_user_job_unique_idx" ON "analysis_runs" USING btree ("user_id","refweaver_job_id") WHERE "analysis_runs"."refweaver_job_id" is not null;
