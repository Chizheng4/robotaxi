#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="4173"
HOST="127.0.0.1"
APP_VERSION="20260615-v022-settlement-fix"
URL="http://${HOST}:${PORT}/?v=${APP_VERSION}&resetRuntime=1"
LOG_FILE="${PROJECT_DIR}/.robotaxi-server.log"

cd "$PROJECT_DIR"

echo "Restarting Robotaxi website on ${URL}"
PIDS="$(lsof -tiTCP:${PORT} -sTCP:LISTEN || true)"
if [ -n "${PIDS}" ]; then
  kill ${PIDS} >/dev/null 2>&1 || true
fi
sleep 1
nohup python3 -m http.server "${PORT}" --bind "${HOST}" >"${LOG_FILE}" 2>&1 &
sleep 1

if curl -fsS "http://${HOST}:${PORT}/" >/dev/null 2>&1; then
  open "$URL"
  echo "Opened ${URL}"
  echo "Runtime cache reset requested by resetRuntime=1"
else
  echo "Robotaxi website failed to start. See ${LOG_FILE}"
  exit 1
fi
