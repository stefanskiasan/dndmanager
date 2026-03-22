#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking if migrations have already been applied..."

# Create a tracking table if it doesn't exist
psql -c "CREATE TABLE IF NOT EXISTS _docker_init (initialized_at TIMESTAMPTZ DEFAULT NOW());" 2>/dev/null

ROW_COUNT=$(psql -t -c "SELECT COUNT(*) FROM _docker_init;" | tr -d ' ')

if [ "$ROW_COUNT" -gt "0" ]; then
  echo "==> Database already initialized, skipping."
  exit 0
fi

echo "==> Running migrations..."
for f in /migrations/*.sql; do
  echo "    Applying: $(basename "$f")"
  psql -f "$f"
done

echo "==> Running seed..."
psql -f /seed.sql

# Mark as initialized
psql -c "INSERT INTO _docker_init DEFAULT VALUES;"

echo "==> Database initialization complete."
