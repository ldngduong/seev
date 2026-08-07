#!/usr/bin/env bash
# Full bootstrap: create venv (if missing), install libraries, run the crawler app.
# Usage: ./run.sh [--dev] [HOST] [PORT]   (defaults: 0.0.0.0:8000)
set -euo pipefail

cd "$(dirname "$0")"

HOST="${2:-0.0.0.0}"
PORT="${3:-8000}"

if [ ! -d ".venv" ]; then
  echo "[run] creating venv..."
  python3 -m venv .venv
fi

echo "[run] installing dependencies..."
.venv/bin/pip install --disable-pip-version-check -q -r requirements.txt

if [ "${1:-}" = "--dev" ]; then
  echo "[run] installing dev/test dependencies..."
  .venv/bin/pip install --disable-pip-version-check -q -r requirements-dev.txt
fi

echo "[run] starting crawler API on http://${HOST}:${PORT}"
exec .venv/bin/uvicorn src.api:app --host "$HOST" --port "$PORT"
