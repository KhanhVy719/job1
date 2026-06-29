#!/usr/bin/env bash
set -euo pipefail

# Restore a Rophim MongoDB archive created by backup-mongodb.sh.
# Required env vars:
#   MONGODB_URI=mongodb://...
# Usage:
#   MONGODB_URI='mongodb://...' bash database/scripts/restore-mongodb.sh /path/to/rophim-YYYY.archive.gz

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "Missing MONGODB_URI env var." >&2
  exit 1
fi

ARCHIVE="${1:-}"
if [[ -z "${ARCHIVE}" || ! -s "${ARCHIVE}" ]]; then
  echo "Usage: $0 /path/to/backup.archive.gz" >&2
  exit 1
fi

echo "About to restore archive: ${ARCHIVE}"
echo "Target URI is read from MONGODB_URI. Secret value is not printed."

mongorestore --uri="${MONGODB_URI}" --archive="${ARCHIVE}" --gzip

echo "Restore complete. Run create-indexes.mongodb.js after restore if needed."
