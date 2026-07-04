#!/usr/bin/env bash
#
# Container/uptime health probe. Returns 0 if the API health endpoint is OK.
# Used as a Docker HEALTHCHECK wrapper and by external uptime monitors.
#
# Usage:
#   ./scripts/healthcheck.sh [url]
#
# Env:
#   HEALTH_URL  Endpoint to probe (default: http://localhost:3000/api/health/live)
#
set -euo pipefail

URL="${1:-${HEALTH_URL:-http://localhost:3000/api/health/live}}"

if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 5 "$URL" >/dev/null
elif command -v wget >/dev/null 2>&1; then
  wget -q -T 5 -O /dev/null "$URL"
else
  echo "[healthcheck] neither curl nor wget available" >&2
  exit 2
fi

echo "[healthcheck] OK: $URL"
