#!/bin/sh
# start the local test server if it isn't running
cd "$(dirname "$0")/.." && (curl -s -o /dev/null http://127.0.0.1:8765/test.html || (nohup python3 -m http.server 8765 >/dev/null 2>&1 & sleep 1))
