#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${PRAXIS_VENV:-/workspace/praxis-venv}"
python3 -m venv "$VENV_DIR"
PIP_CACHE_DIR=/workspace/pip-cache "$VENV_DIR/bin/python" -m pip install -r "$ROOT_DIR/backend/requirements.txt"
mkdir -p /workspace/praxis-data
cd "$ROOT_DIR/frontend"
npm ci --cache /workspace/npm-cache --no-audit --no-fund
npm run build
