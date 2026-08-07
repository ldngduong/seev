#!/usr/bin/env bash
# Quick start: reuse the existing venv and run the app (no install step).
# Usage: ./start.sh [HOST] [PORT]   (defaults: 0.0.0.0:8000)
set -euo pipefail

cd "$(dirname "$0")"

HOST="${1:-0.0.0.0}"
PORT="${2:-8000}"

if [ ! -d ".venv" ]; then
  echo "[start] .venv not found — run ./run.sh first to create and install it." >&2
  exit 1
fi

echo "[start] starting crawler API on http://${HOST}:${PORT}"
exec .venv/bin/uvicorn src.api:app --host "$HOST" --port "$PORT"
