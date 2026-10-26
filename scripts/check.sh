#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${PRAXIS_VENV:-/workspace/praxis-venv}"
cd "$ROOT_DIR/backend"
"$VENV_DIR/bin/python" -m pytest -q
cd "$ROOT_DIR/frontend"
npm test
npm run build
