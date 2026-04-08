#!/usr/bin/env bash
# Bootstrap script: runs all migrations in journal order
# Usage: bootstrap.sh <DATABASE_URL>

set -euo pipefail

DATABASE_URL="${1:-${DATABASE_URL}}"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is required"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(dirname "$SCRIPT_DIR")/migrations"

echo "Dropping all tables in public schema..."
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true

echo "Applying migrations in journal order..."
for f in "$MIGRATIONS_DIR"/*.sql; do
  if [ -f "$f" ]; then
    echo "Applying: $(basename "$f")"
    psql "$DATABASE_URL" -f "$f"
  fi
done

echo "Bootstrap complete."
