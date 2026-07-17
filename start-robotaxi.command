#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="4173"
HOST="127.0.0.1"
APP_VERSION="$(date +%Y%m%d-%H%M%S)"
URL="http://${HOST}:${PORT}/?v=${APP_VERSION}"
LOG_FILE="${PROJECT_DIR}/.robotaxi-server.log"

cd "$PROJECT_DIR"

echo "==> Building frontend bundle from src/main.jsx ..."
node -e '
try {
  const fs = require("fs");
  const babel = require("./vendor/babel.min.js");
  const src = fs.readFileSync("src/main.jsx", "utf8");
  const result = babel.transform(src, { presets: ["react"] });
  fs.writeFileSync("src/main.bundle.js", result.code + "\n");
  console.log("    Bundle OK (" + result.code.length + " bytes)");
} catch(e) {
  console.error("    Bundle FAILED: " + e.message);
  process.exit(1);
}
'

echo "==> Restarting server on ${URL}"
PIDS="$(lsof -tiTCP:${PORT} -sTCP:LISTEN || true)"
if [ -n "${PIDS}" ]; then
  kill ${PIDS} >/dev/null 2>&1 || true
fi
sleep 1

# Custom Python server with no-cache headers
nohup python3 -c "
import http.server
import os
import sys

os.chdir('${PROJECT_DIR}')

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        pass  # silent

server = http.server.ThreadingHTTPServer(('${HOST}', ${PORT}), NoCacheHandler)
server.daemon_threads = True
print('Serving on ${HOST}:${PORT} with no-cache headers', flush=True)
sys.stdout.flush()
server.serve_forever()
" >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
sleep 1

if python3 scripts/verify-server-readiness.py "${HOST}" "${PORT}"; then
  ROBOTAXI_BROWSER_VERIFY_URL="${URL}" node scripts/verify-browser-load.mjs
  if [ "${ROBOTAXI_SKIP_BROWSER_OPEN:-0}" = "1" ]; then
    echo "==> Browser opening skipped for automated verification."
  else
    open "$URL"
    echo "==> Opened ${URL} in the system default browser."
  fi
  echo "==> Concurrent resource check passed. Browser render check passed. Cache disabled. Runtime data preserved."
  echo "==> Server is running on ${URL}"
  echo "==> Keep this command window open. Press Ctrl-C to stop the Robotaxi server."
  wait "${SERVER_PID}"
else
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
  echo "ERROR: Server failed to start. See ${LOG_FILE}"
  exit 1
fi
