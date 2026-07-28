#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="4173"
HOST="127.0.0.1"
cd "$ROOT_DIR"

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "端口 $PORT 已被占用；为避免触碰现有服务，媒体采集已停止。" >&2
  exit 1
fi

python3 -c "
import http.server
import os
os.chdir('$ROOT_DIR')
class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()
    def log_message(self, format, *args):
        pass
server = http.server.ThreadingHTTPServer(('$HOST', $PORT), NoCacheHandler)
server.serve_forever()
" >/private/tmp/robotaxi-evidence-media-server.log 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" >/dev/null 2>&1 || true; wait "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

for _ in {1..20}; do
  if curl --silent --fail "http://$HOST:$PORT/index.html" >/dev/null; then break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    cat /private/tmp/robotaxi-evidence-media-server.log >&2 || true
    exit 1
  fi
  sleep 0.25
done
curl --silent --fail "http://$HOST:$PORT/index.html" >/dev/null
ROBOTAXI_MEDIA_CAPTURE_URL="http://$HOST:$PORT/?publicDemo=1&mediaCapture=1" node scripts/capture-evidence-media.mjs
node scripts/verify-media-draft-contract.mjs
