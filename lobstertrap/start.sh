#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BINARY="$SCRIPT_DIR/lobstertrap-bin"

if [ ! -f "$BINARY" ]; then
  echo "Lobster Trap binary not found. Run: bash lobstertrap/build.sh"
  exit 1
fi

"$BINARY" serve \
  --backend https://generativelanguage.googleapis.com/v1beta/openai/ \
  --policy "$SCRIPT_DIR/chefpro-policy.yaml" \
  --listen :8080 \
  --audit-log /tmp/chefpro-ai-audit.log

echo "Lobster Trap running at http://localhost:8080"
echo "Dashboard: http://localhost:8080/_lobstertrap/"
