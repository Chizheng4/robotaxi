#!/usr/bin/env python3

import socket
import sys
import urllib.request


host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
port = int(sys.argv[2]) if len(sys.argv) > 2 else 4173
base_url = f"http://{host}:{port}"
critical_resources = {
    "/": b'id="app"',
    "/vendor/react.production.min.js": b"React",
    "/vendor/react-dom.production.min.js": b"ReactDOM",
    "/vendor/antd.min.js": b"antd",
    "/src/styles.css": b".ops-shell",
    "/src/main.bundle.js": b"bootstrap",
}

# A partial request reproduces the connection that previously blocked HTTPServer.
blocking_socket = socket.create_connection((host, port), timeout=2)
blocking_socket.sendall(f"GET / HTTP/1.1\r\nHost: {host}\r\n".encode("ascii"))

try:
    for path, marker in critical_resources.items():
        with urllib.request.urlopen(f"{base_url}{path}", timeout=3) as response:
            content = response.read()
            if response.status != 200 or marker not in content:
                raise RuntimeError(f"critical resource check failed: {path}")
finally:
    blocking_socket.close()

print("    Startup readiness OK: concurrent server and critical resources available")
