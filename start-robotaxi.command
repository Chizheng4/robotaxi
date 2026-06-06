#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="4173"
URL="http://localhost:${PORT}/?v=20260606-v016-route-strategy-number"
LOG_FILE="${PROJECT_DIR}/.robotaxi-server.log"

cd "$PROJECT_DIR"

if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Robotaxi website is already running on ${URL}"
else
  echo "Starting Robotaxi website on ${URL}"
  nohup python3 -m http.server "${PORT}" >"${LOG_FILE}" 2>&1 &
  sleep 1
fi

open "$URL"
echo "Opened ${URL}"
