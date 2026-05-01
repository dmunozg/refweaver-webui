-- Drop FK constraints referencing users.id (required before altering column type)
ALTER TABLE "analysis_runs" DROP CONSTRAINT IF EXISTS "analysis_runs_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_owner_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_user_id_users_id_fk";--> statement-breakpoint

-- Alter users.id from uuid to text (Better Auth uses opaque string IDs)
ALTER TABLE "users" ALTER COLUMN "id" TYPE text USING id::text;--> statement-breakpoint

-- Alter dependent *_user_id columns from uuid to text
ALTER TABLE "analysis_runs" ALTER COLUMN "user_id" TYPE text USING user_id::text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "owner_user_id" TYPE text USING owner_user_id::text;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" TYPE text USING user_id::text;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "user_id" TYPE text USING user_id::text;--> statement-breakpoint

-- Recreate FK constraints with prior semantics (all ON DELETE CASCADE)
DO $$
BEGIN
  ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;