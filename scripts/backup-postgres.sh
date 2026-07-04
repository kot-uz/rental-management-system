#!/usr/bin/env bash
#
# Daily Postgres backup → gzip → optional MinIO upload.
# Mirrors docs/devops/deployment.md §"Backup scripts".
#
# Usage:
#   ./scripts/backup-postgres.sh
#
# Env:
#   DATABASE_URL        Postgres connection string (required)
#   BACKUP_DIR          Local output dir (default: ./backups)
#   MINIO_ALIAS         mc alias for the backup bucket (optional)
#   MINIO_BACKUP_BUCKET Target bucket, e.g. rental-backups (optional)
#   BACKUP_RETENTION_DAYS  Local retention (default: 14)
#
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/rental-$STAMP.sql.gz"

echo "[backup] dumping database → $OUT"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$OUT"
echo "[backup] wrote $(du -h "$OUT" | cut -f1)"

if [[ -n "${MINIO_ALIAS:-}" && -n "${MINIO_BACKUP_BUCKET:-}" ]]; then
  if command -v mc >/dev/null 2>&1; then
    echo "[backup] uploading to ${MINIO_ALIAS}/${MINIO_BACKUP_BUCKET}"
    mc cp "$OUT" "${MINIO_ALIAS}/${MINIO_BACKUP_BUCKET}/"
  else
    echo "[backup] WARNING: mc not found, skipping remote upload" >&2
  fi
fi

echo "[backup] pruning local backups older than ${RETENTION} days"
find "$BACKUP_DIR" -name 'rental-*.sql.gz' -type f -mtime "+${RETENTION}" -delete

echo "[backup] done"
