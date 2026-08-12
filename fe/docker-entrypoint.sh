#!/bin/sh
set -eu

escaped_api_url="$(printf '%s' "${VITE_API_URL:-}" | sed 's/\\/\\\\/g; s/"/\\"/g')"

printf 'window.__SEEV_RUNTIME_CONFIG__ = { VITE_API_URL: "%s" };\n' \
  "$escaped_api_url" \
  > /usr/share/nginx/html/env.js

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
