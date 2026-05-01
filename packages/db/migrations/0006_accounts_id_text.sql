-- Alter accounts.id from uuid to text (Better Auth uses opaque string IDs)
ALTER TABLE "accounts" ALTER COLUMN "id" TYPE text USING "id"::text;--> statement-breakpoint

-- Remove the gen_random_uuid() default now that id is text (Better Auth generates IDs externally)
ALTER TABLE "accounts" ALTER COLUMN "id" DROP DEFAULT;