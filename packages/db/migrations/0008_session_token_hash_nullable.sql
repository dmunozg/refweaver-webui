-- Relax session_token_hash NOT NULL for Better Auth adapter compatibility
ALTER TABLE "sessions" ALTER COLUMN "session_token_hash" DROP NOT NULL;