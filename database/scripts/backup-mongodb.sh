#!/usr/bin/env bash
set -euo pipefail

# MongoDB backup script for Rophim.
# Required env vars:
#   MONGODB_URI=mongodb://...
# Optional env vars:
#   MONGO_DATABASE=rophim
#   MONGO_BACKUP_DIR=/var/backups/rophim-mongodb
#   MONGO_BACKUP_RETENTION_DAYS=7

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "Missing MONGODB_URI env var." >&2
  exit 1
fi

MONGO_DATABASE="${MONGO_DATABASE:-rophim}"
MONGO_BACKUP_DIR="${MONGO_BACKUP_DIR:-/var/backups/rophim-mongodb}"
MONGO_BACKUP_RETENTION_DAYS="${MONGO_BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${MONGO_BACKUP_DIR}/${MONGO_DATABASE}-${TIMESTAMP}"
ARCHIVE="${OUT_DIR}.archive.gz"

mkdir -p "${MONGO_BACKUP_DIR}"
chmod 700 "${MONGO_BACKUP_DIR}"

echo "==> Creating MongoDB backup: ${ARCHIVE}"
mongodump --uri="${MONGODB_URI}" --db="${MONGO_DATABASE}" --archive="${ARCHIVE}" --gzip
chmod 600 "${ARCHIVE}"

echo "==> Verifying backup file exists"
test -s "${ARCHIVE}"

echo "==> Removing local backups older than ${MONGO_BACKUP_RETENTION_DAYS} days"
find "${MONGO_BACKUP_DIR}" -type f -name "${MONGO_DATABASE}-*.archive.gz" -mtime +"${MONGO_BACKUP_RETENTION_DAYS}" -delete

echo "Backup complete: ${ARCHIVE}"
echo "Next step: copy/upload this archive to external storage (R2/S3/B2/backup server)."
