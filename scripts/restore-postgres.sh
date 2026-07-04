#!/usr/bin/env bash
#
# Restore a Postgres backup produced by backup-postgres.sh.
# Mirrors docs/devops/deployment.md §"Restore scripts".
#
# Usage:
#   ./scripts/restore-postgres.sh ./backups/rental-20260101T000000Z.sql.gz
#
# Env:
#   DATABASE_URL  Target Postgres connection string (required)
#   FORCE=1       Skip the confirmation prompt (for automated drills)
#
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
ARCHIVE="${1:?Usage: restore-postgres.sh <backup.sql.gz>}"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "[restore] file not found: $ARCHIVE" >&2
  exit 1
fi

if [[ "${FORCE:-0}" != "1" ]]; then
  echo "!! This will OVERWRITE the database at the configured DATABASE_URL."
  read -r -p "Type 'yes' to continue: " CONFIRM
  [[ "$CONFIRM" == "yes" ]] || { echo "[restore] aborted"; exit 1; }
fi

echo "[restore] restoring from $ARCHIVE"
gunzip -c "$ARCHIVE" | psql "$DATABASE_URL"
echo "[restore] done"
