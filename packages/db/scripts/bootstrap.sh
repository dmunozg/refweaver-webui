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
JOURNAL_FILE="$MIGRATIONS_DIR/meta/_journal.json"

echo "Dropping all tables in public schema..."
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true

if [ ! -f "$JOURNAL_FILE" ]; then
  echo "ERROR: Journal file not found: $JOURNAL_FILE"
  exit 1
fi

echo "Applying migrations in journal order..."

# Try jq first; fall back to POSIX parser if unavailable
if command -v jq >/dev/null 2>&1; then
  # jq-based path resolution
  while IFS= read -r tag; do
    migration_file="$MIGRATIONS_DIR/$tag.sql"
    if [ ! -f "$migration_file" ]; then
      echo "ERROR: Migration file missing: $migration_file (journal entry: $tag)"
      exit 1
    fi
    echo "Applying: $tag.sql"
    psql "$DATABASE_URL" -f "$migration_file"
  done < <(jq -r '.entries[] | .tag' "$JOURNAL_FILE")
else
  # POSIX fallback: parse journal with grep/sed
  # Extract all .tag values in order using grep and sed
  tags=$(grep -o '"tag": "[^"]*"' "$JOURNAL_FILE" | sed 's/"tag": "//g; s/"//g')
  if [ -z "$tags" ]; then
    echo "ERROR: Could not parse tags from journal: $JOURNAL_FILE"
    exit 1
  fi
  for tag in $tags; do
    migration_file="$MIGRATIONS_DIR/$tag.sql"
    if [ ! -f "$migration_file" ]; then
      echo "ERROR: Migration file missing: $migration_file (journal entry: $tag)"
      exit 1
    fi
    echo "Applying: $tag.sql"
    psql "$DATABASE_URL" -f "$migration_file"
  done
fi

echo "Bootstrap complete."