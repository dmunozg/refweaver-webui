WITH ranked_admins AS (
  SELECT
    "id",
    row_number() OVER (
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "admin_rank"
  FROM "users"
  WHERE "admin_role" = 'admin'
),
admins_to_demote AS (
  SELECT "id"
  FROM ranked_admins
  WHERE "admin_rank" > 1
)
UPDATE "users"
SET
  "admin_role" = 'user',
  "updated_at" = now()
WHERE "id" IN (SELECT "id" FROM admins_to_demote);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "users_single_admin_idx"
  ON "users" USING btree ("admin_role")
  WHERE "admin_role" = 'admin';
