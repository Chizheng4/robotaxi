#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="4173"
HOST="127.0.0.1"
APP_VERSION="$(date +%Y%m%d-%H%M%S)"
URL="http://${HOST}:${PORT}/?v=${APP_VERSION}"
LOG_FILE="${PROJECT_DIR}/.robotaxi-server.log"

open_in_codex_browser() {
  local target_url="$1"
  osascript - "$target_url" <<'APPLESCRIPT'
on run argv
  set targetURL to item 1 of argv
  set localPrefix to "http://127.0.0.1:4173/"

  tell application id "com.openai.codex"
    repeat with appWindow in windows
      repeat with tabIndex from 1 to count of tabs of appWindow
        set appTab to tab tabIndex of appWindow
        if (URL of appTab starts with localPrefix) then
          set URL of appTab to targetURL
          set active tab index of appWindow to tabIndex
          set index of appWindow to 1
          activate
          return "reused"
        end if
      end repeat
    end repeat

    if (count of windows) is 0 then make new window
    tell front window
      set newTab to make new tab with properties {URL:targetURL}
      set active tab index to count of tabs
    end tell
    activate
    return "opened"
  end tell
end run
APPLESCRIPT
}

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
  if CODEX_BROWSER_RESULT="$(open_in_codex_browser "$URL")"; then
    echo "==> Opened ${URL} in Codex Browser (${CODEX_BROWSER_RESULT})"
  else
    echo "WARNING: Codex Browser unavailable; opening the system default browser instead."
    open "$URL"
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
