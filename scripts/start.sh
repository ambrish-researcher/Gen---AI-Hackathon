#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${PRAXIS_VENV:-/workspace/praxis-venv}"
BACKEND_PID=''
FRONTEND_PID=''
cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$BACKEND_PID" ]]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [[ -n "$FRONTEND_PID" ]]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM
(cd "$ROOT_DIR/backend" && exec "$VENV_DIR/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --timeout-graceful-shutdown 2) &
BACKEND_PID=$!
(cd "$ROOT_DIR/frontend" && exec node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 --strictPort) &
FRONTEND_PID=$!
wait -n "$BACKEND_PID" "$FRONTEND_PID"
